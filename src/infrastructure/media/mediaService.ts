import { NativeModules, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import {
  ALVO_MAXIMO_FOTO_KB,
  calcularRecorteQuadradoCentral,
  CoordenadasGps,
  ehUriFotoReal,
  LADO_MAXIMO_FOTO_PX,
} from "../../domain/rules/watermarkRules";

interface MultiShareNativeModule {
  shareMultipleImages(fileUris: readonly string[], dialogTitle: string): Promise<number>;
}

export interface GpsWatermarkContext {
  readonly coordenadas: CoordenadasGps | null;
  readonly municipioGps: string | null;
}

export interface SavedSandboxPhotoResult {
  readonly localUri: string;
  readonly tamanhoKb: number;
  readonly salvoNaGaleriaCelular: boolean;
}

export interface SharePhotosResult {
  readonly sharedCount: number;
  readonly mode:
    | "native_file"
    | "native_multiple"
    | "native_sequential"
    | "fallback_text"
    | "no_real_file";
}

const PRIVATE_GALLERY_FOLDER = "arpe_galeria";
const DEVICE_ALBUM_NAME = "ARPE Fiscalização";
const FALLBACK_RESIZE_PX = 1200;

async function salvarCopiaNaGaleriaDoCelular(
  localUri: string
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    // writeOnly = true evita erro de permissão READ_MEDIA_AUDIO no Expo Go / Android 13+
    const perm = await MediaLibrary.requestPermissionsAsync(true);
    if (!perm.granted) return false;

    try {
      const asset = await MediaLibrary.createAssetAsync(localUri);
      try {
        const album = await MediaLibrary.getAlbumAsync(DEVICE_ALBUM_NAME);
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync(DEVICE_ALBUM_NAME, asset, false);
        }
      } catch {
        // Em Scoped Storage / Expo Go, createAssetAsync já salva em Pictures/
      }
      return true;
    } catch {
      await MediaLibrary.saveToLibraryAsync(localUri);
      return true;
    }
  } catch {
    return false;
  }
}

function getPrivateGalleryDir(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${PRIVATE_GALLERY_FOLDER}/`;
}

function sanitizarNomeArquivo(nomeArquivo: string): string {
  const limpo = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
  return limpo.toLowerCase().endsWith(".jpg") || limpo.toLowerCase().endsWith(".jpeg")
    ? limpo
    : `${limpo}.jpg`;
}

function comTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

async function limparTemporariosSilenciosamente(uris: readonly string[]): Promise<void> {
  const dirPrivado = getPrivateGalleryDir();
  for (const uri of uris) {
    if (!uri || (dirPrivado && uri.startsWith(dirPrivado))) continue;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignora falha de arquivo temporário já removido pelo SO
    }
  }
}

export const mediaService = {
  /**
   * Obtém coordenadas GPS offline-capable (satélite) e tenta reverse geocode rápido
   * quando houver rede, sem bloquear a captura em campo sem sinal.
   */
  async obterContextoGpsMarcaDagua(): Promise<GpsWatermarkContext> {
    if (Platform.OS === "web") {
      return { coordenadas: null, municipioGps: null };
    }

    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        return { coordenadas: null, municipioGps: null };
      }

      const posicaoAtual = await comTimeout<Location.LocationObject | null>(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        3500,
        null
      );

      const posicao =
        posicaoAtual ??
        (await comTimeout<Location.LocationObject | null>(
          Location.getLastKnownPositionAsync(),
          1200,
          null
        ));

      if (!posicao) {
        return { coordenadas: null, municipioGps: null };
      }

      const coordenadas: CoordenadasGps = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      };

      const enderecos = await comTimeout<Location.LocationGeocodedAddress[]>(
        Location.reverseGeocodeAsync(coordenadas),
        1800,
        []
      );
      const primeiro = enderecos[0];
      const municipioGps =
        primeiro?.subregion?.trim() ||
        primeiro?.city?.trim() ||
        primeiro?.district?.trim() ||
        null;

      return { coordenadas, municipioGps };
    } catch {
      return { coordenadas: null, municipioGps: null };
    }
  },

  /**
   * Recorta a foto bruta da câmera exatamente no quadrado central (1:1).
   */
  async recortarQuadradoCentral(
    rawUri: string,
    width: number,
    height: number
  ): Promise<string> {
    const spec = calcularRecorteQuadradoCentral(width, height, LADO_MAXIMO_FOTO_PX);
    const resultado = await ImageManipulator.manipulateAsync(
      rawUri,
      [
        {
          crop: {
            originX: spec.originX,
            originY: spec.originY,
            width: spec.width,
            height: spec.height,
          },
        },
        {
          resize: {
            width: spec.resizeSide,
            height: spec.resizeSide,
          },
        },
      ],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return resultado.uri;
  },

  /**
   * Comprime a foto já carimbada (alvo <= 250 KB) e move para o sandbox privado
   * `FileSystem.documentDirectory/arpe_galeria/` (fora da galeria pública — LGPD).
   */
  async finalizarFotoNoSandboxPrivado(params: {
    readonly stampedTempUri: string;
    readonly nomeArquivo: string;
    readonly rawTempUrisToClean?: readonly string[];
    readonly salvarNaGaleriaCelular?: boolean;
  }): Promise<SavedSandboxPhotoResult> {
    const dirPrivado = getPrivateGalleryDir();
    if (!dirPrivado) {
      return {
        localUri: params.stampedTempUri,
        tamanhoKb: 195,
        salvoNaGaleriaCelular: false,
      };
    }

    await FileSystem.makeDirectoryAsync(dirPrivado, { intermediates: true });

    let comprimida = await ImageManipulator.manipulateAsync(
      params.stampedTempUri,
      [{ resize: { width: LADO_MAXIMO_FOTO_PX, height: LADO_MAXIMO_FOTO_PX } }],
      {
        compress: 0.78,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    const tempsExtras: string[] = [params.stampedTempUri];
    let info = await FileSystem.getInfoAsync(comprimida.uri);
    let sizeBytes = info.exists && "size" in info && typeof info.size === "number" ? info.size : 0;

    if (sizeBytes > ALVO_MAXIMO_FOTO_KB * 1024) {
      tempsExtras.push(comprimida.uri);
      comprimida = await ImageManipulator.manipulateAsync(
        comprimida.uri,
        [{ resize: { width: FALLBACK_RESIZE_PX, height: FALLBACK_RESIZE_PX } }],
        {
          compress: 0.62,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      info = await FileSystem.getInfoAsync(comprimida.uri);
      sizeBytes = info.exists && "size" in info && typeof info.size === "number" ? info.size : sizeBytes;
    }

    const destinoUri = `${dirPrivado}${Date.now()}_${sanitizarNomeArquivo(params.nomeArquivo)}`;
    await FileSystem.moveAsync({
      from: comprimida.uri,
      to: destinoUri,
    });

    let salvoNaGaleriaCelular = false;
    if (params.salvarNaGaleriaCelular ?? true) {
      salvoNaGaleriaCelular = await salvarCopiaNaGaleriaDoCelular(destinoUri);
    }

    await limparTemporariosSilenciosamente([
      ...tempsExtras,
      ...(params.rawTempUrisToClean ?? []),
    ]);

    const tamanhoKb = Math.max(1, Math.round((sizeBytes || 195 * 1024) / 1024));
    return {
      localUri: destinoUri,
      tamanhoKb,
      salvoNaGaleriaCelular,
    };
  },

  /**
   * Remove arquivos físicos do sandbox privado quando excluídos definitivamente da Galeria.
   */
  async removerArquivosPrivados(uris: readonly string[]): Promise<void> {
    const dirPrivado = getPrivateGalleryDir();
    if (!dirPrivado) return;
    for (const uri of uris) {
      if (!uri || !uri.startsWith(dirPrivado)) continue;
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // arquivo já inexistente
      }
    }
  },

  /**
   * Compartilha 1 foto ou múltiplas fotos JPEG diretamente (ACTION_SEND_MULTIPLE
   * no APK nativo Android; fallback sequencial no Expo Go), sem gerar ZIP nem Base64.
   */
  async compartilharFotos(
    fotos: readonly { readonly nomeArquivo: string; readonly localUri: string }[]
  ): Promise<SharePhotosResult> {
    if (fotos.length === 0) {
      return { sharedCount: 0, mode: "no_real_file" };
    }

    const reais: { readonly nomeArquivo: string; readonly localUri: string }[] = [];
    for (const foto of fotos) {
      if (!ehUriFotoReal(foto.localUri)) continue;
      if (Platform.OS === "web") {
        reais.push(foto);
        continue;
      }
      try {
        const info = await FileSystem.getInfoAsync(foto.localUri);
        if (info.exists) {
          reais.push(foto);
        }
      } catch {
        // ignora arquivo inacessível
      }
    }

    if (reais.length === 0) {
      return { sharedCount: 0, mode: "no_real_file" };
    }

    if (Platform.OS === "android" && reais.length > 1) {
      const multiShare = NativeModules.MultiShare as
        | MultiShareNativeModule
        | undefined;
      if (multiShare?.shareMultipleImages) {
        const sent = await multiShare.shareMultipleImages(
          reais.map((f) => f.localUri),
          `Compartilhar ${reais.length} fotos da vistoria ARPE`
        );
        return { sharedCount: sent, mode: "native_multiple" };
      }
    }

    if (Platform.OS !== "web") {
      const disponivel = await Sharing.isAvailableAsync();
      if (disponivel) {
        if (reais.length === 1) {
          await Sharing.shareAsync(reais[0].localUri, {
            mimeType: "image/jpeg",
            dialogTitle: "Compartilhar foto da vistoria ARPE",
            UTI: "public.jpeg",
          });
          return { sharedCount: 1, mode: "native_file" };
        }

        for (let i = 0; i < reais.length; i += 1) {
          await Sharing.shareAsync(reais[i].localUri, {
            mimeType: "image/jpeg",
            dialogTitle: `Foto ${i + 1} de ${reais.length} — ARPE`,
            UTI: "public.jpeg",
          });
        }
        return { sharedCount: reais.length, mode: "native_sequential" };
      }
    }

    if (Platform.OS !== "web") {
      const nomes = reais.map((f) => f.nomeArquivo).join(", ");
      await Share.share({
        message: `${reais.length} foto(s) da Galeria ARPE: ${nomes}`,
      });
    }
    return { sharedCount: reais.length, mode: "fallback_text" };
  },
};

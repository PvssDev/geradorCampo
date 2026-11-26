import React, { memo, useEffect, useMemo, useState } from "react";
import { montarLinhasMarcaDagua } from "../../../domain/rules/watermarkRules";
import { GpsWatermarkContext } from "../../../infrastructure/media/mediaService";
import { FotoWatermarkStamp } from "./FotoWatermarkStamp";

interface LiveWatermarkStampProps {
  readonly gpsCtx: GpsWatermarkContext;
  readonly cidadeVistoria?: string;
  readonly localVistoria?: string;
  readonly canvasSidePx: number;
}

/**
 * Isola o intervalo de 1s do relógio para evitar re-renderizações no CameraView.
 */
export const LiveWatermarkStamp: React.FC<LiveWatermarkStampProps> = memo(
  ({ gpsCtx, cidadeVistoria, localVistoria, canvasSidePx }) => {
    const [agora, setAgora] = useState<Date>(() => new Date());

    useEffect(() => {
      setAgora(new Date());
      const id = setInterval(() => setAgora(new Date()), 1000);
      return () => clearInterval(id);
    }, []);

    const marca = useMemo(
      () =>
        montarLinhasMarcaDagua({
          dataHora: agora,
          coordenadas: gpsCtx.coordenadas,
          municipioGps: gpsCtx.municipioGps,
          cidadeVistoria,
          localVistoria,
        }),
      [agora, gpsCtx, cidadeVistoria, localVistoria]
    );

    return (
      <FotoWatermarkStamp
        linhas={marca.todasLinhas}
        canvasSidePx={canvasSidePx}
      />
    );
  }
);

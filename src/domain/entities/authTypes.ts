export type UserRole = "adm" | "coordenador" | "analista";
export type RequestableRole = Exclude<UserRole, "adm">;
export type AccessRequestStatus = "pendente" | "aprovada" | "rejeitada";

export interface AuthUserProfile {
  readonly id: string;
  readonly usuario: string;
  readonly nomeCompleto: string;
  readonly role: UserRole;
  readonly ativo: boolean;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly perfil: AuthUserProfile;
}

export interface AccessRequestEntity {
  readonly id: string;
  readonly usuario: string;
  readonly nomeCompleto: string;
  readonly roleSolicitado: RequestableRole;
  readonly status: AccessRequestStatus;
  readonly criadoEm: string;
  readonly decididoPor?: string;
}

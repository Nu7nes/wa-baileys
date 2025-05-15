export const SUCCESS = 200; //Sucesso
export const BAD_REQUEST = 400; // parametros invalidos enviados no request
export const UNAUTHORIZED = 401; // erro de senha ou autenticações inválidas , acesso proibido
export const FORBIDDEN = 403; // ausencia de token na requisição
export const NOT_FOUND = 404; // conteudo não encontrado, pagina não econtrada
export const CONFLICT = 409; // conflito , arquivo ja existe, conteudo duplicado, dado já inserido
export const CONTENT_TOO_LARGE = 413; // conteudo muito longo, arquivo muito grande,
export const INTERNAL_SERVER_ERROR = 500; // erro interno, exceções do cath;
export const UNAVAILABLE = 503; // Serviço indisponível;

export type StatuscodeType =
  | typeof SUCCESS
  | typeof BAD_REQUEST
  | typeof UNAUTHORIZED
  | typeof FORBIDDEN
  | typeof NOT_FOUND
  | typeof CONFLICT
  | typeof CONTENT_TOO_LARGE
  | typeof INTERNAL_SERVER_ERROR
  | typeof UNAVAILABLE;
/**
 * Interface para representar o retorno.
 */
export interface IRetorno {
  statuscode: StatuscodeType;
  message: string;
  data?: any;
  errors?: string[];
}

/**
 * Funcões de retorno.
 */
export function sucesso(data: any, message?: string): IRetorno {
  return { statuscode: SUCCESS, message: message || "OK", data };
}
export function conteudoLongo(message?: string): IRetorno {
  return {
    statuscode: CONTENT_TOO_LARGE,
    message: message || "Conteúdo muito longo. Adicione mais filtros",
    data: [],
  };
}
export function dadosNaoEncontrados(message?: string): IRetorno {
  return {
    statuscode: NOT_FOUND,
    message: message || "Dados não localizados",
    data: [],
  };
}
export function naoAutorizado(message?: string): IRetorno {
  return {
    statuscode: UNAUTHORIZED,
    message: message || "Você não está autorizado",
    data: [],
  };
}
export function naoAutenticado(message?: string): IRetorno {
  return {
    statuscode: FORBIDDEN,
    message: message || "Você não está autenticado",
    data: [],
  };
}

export function erroInterno(error: any, message?: string): IRetorno {
  const messageError = error.error ? error.error : error.toString();
  return {
    statuscode: INTERNAL_SERVER_ERROR,
    message: message || "Erro interno",
    data: [],
    errors: [messageError],
  };
}
export function parametrosInvalidos(errors: any, message?: string): IRetorno {
  return {
    statuscode: BAD_REQUEST,
    message: message || "Parametros inválidos",
    data: [],
    errors: errors,
  };
}
export function conflito(error: any, message?: string): IRetorno {
  return {
    statuscode: CONFLICT,
    message: message || "Dados já existem",
    data: [],
    errors: [error],
  };
}
export function servicoIndisponivel(error: any, message?: string): IRetorno {
  const messageError = error.error ? error.error : error.toString();
  return {
    statuscode: UNAVAILABLE,
    message: message || "Serviço indisponível",
    data: [],
    errors: [messageError],
  };
}

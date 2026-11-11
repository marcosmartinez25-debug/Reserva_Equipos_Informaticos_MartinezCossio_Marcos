export type CodigoError =
  | 'DATOS_INVALIDOS'
  | 'NO_ENCONTRADO'
  | 'NO_OPERATIVO'
  | 'YA_RESERVADO'
  | 'SIN_PERMISO'
  | 'YA_CANCELADA'
  | 'FECHA_PASADA';

export class ErrorDominio extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
  }
}

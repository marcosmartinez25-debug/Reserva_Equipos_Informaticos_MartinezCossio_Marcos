export class ErrorDominio extends Error {
  constructor(codigo, mensaje, errores = {}) {
    super(mensaje);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
    this.errores = errores;
  }
}

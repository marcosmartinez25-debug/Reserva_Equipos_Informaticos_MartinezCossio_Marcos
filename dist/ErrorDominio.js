export class ErrorDominio extends Error {
    codigo;
    constructor(codigo, mensaje) {
        super(mensaje);
        this.name = 'ErrorDominio';
        this.codigo = codigo;
    }
}

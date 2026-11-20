// @ts-check
/**
 * Doble de Notificador: guarda lo que habría enviado en lugar de llamar a Expo.
 */
class NotificadorEnMemoria {
  constructor() {
    /** @type {{ userId: number, titulo: string, cuerpo: string, datos: Record<string, string> }[]} */
    this.enviados = [];
  }

  /**
   * @param {number} userId
   * @param {{ titulo: string, cuerpo: string, datos: Record<string, string> }} aviso
   */
  async avisar(userId, aviso) {
    this.enviados.push({ userId, ...aviso });
  }
}

module.exports = { NotificadorEnMemoria };

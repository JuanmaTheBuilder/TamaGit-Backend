// @ts-check
const TITULOS = {
  pet_deleted: 'Tu mascota fue eliminada',
  item_removed: 'Te quitaron un item',
  banned: 'Cuenta suspendida',
};

/**
 * @param {string} type tipo de la Notification
 * @returns {string} título del aviso push
 */
function tituloPara(type) {
  return TITULOS[type] || 'Tamagit';
}

module.exports = { tituloPara };

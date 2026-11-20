export interface BrickColor {
  id: string;
  name: string;
  nameFr: string;
  hex: string;
  legoId?: number;
  gobricksCode?: string;
  textColor: '#FFFFFF' | '#1A1A1A'; // Contraste automatique pour les badges
}

export const LEGO_GOBRICKS_PALETTE: BrickColor[] = [
  // Couleur Principale du site
  { id: 'reddish-orange', name: 'Reddish Orange', nameFr: 'Orange Rougeâtre (Principal)', hex: '#FE5000', legoId: 402, gobricksCode: 'GB-186', textColor: '#FFFFFF' },
  
  // Rouges & Oranges
  { id: 'bright-red', name: 'Bright Red', nameFr: 'Rouge Vif', hex: '#C91A09', legoId: 21, gobricksCode: 'GB-005', textColor: '#FFFFFF' },
  { id: 'dark-red', name: 'Dark Red', nameFr: 'Rouge Foncé', hex: '#720E0F', legoId: 154, gobricksCode: 'GB-059', textColor: '#FFFFFF' },
  { id: 'coral', name: 'Coral', nameFr: 'Corail', hex: '#FF698F', legoId: 353, gobricksCode: 'GB-175', textColor: '#1A1A1A' },
  { id: 'bright-orange', name: 'Bright Orange', nameFr: 'Orange Vif', hex: '#FE8A18', legoId: 106, gobricksCode: 'GB-004', textColor: '#1A1A1A' },
  { id: 'dark-orange', name: 'Dark Orange', nameFr: 'Orange Foncé', hex: '#A95500', legoId: 38, gobricksCode: 'GB-068', textColor: '#FFFFFF' },
  { id: 'medium-nougat', name: 'Medium Nougat', nameFr: 'Nougat Moyen', hex: '#AA7D55', legoId: 312, gobricksCode: 'GB-150', textColor: '#FFFFFF' },

  // Jaunes
  { id: 'bright-yellow', name: 'Bright Yellow', nameFr: 'Jaune Vif', hex: '#F2CD37', legoId: 24, gobricksCode: 'GB-003', textColor: '#1A1A1A' },
  { id: 'flame-yellowish-orange', name: 'Flame Yellowish Orange', nameFr: 'Jaune Orangé', hex: '#F8BB3D', legoId: 191, gobricksCode: 'GB-110', textColor: '#1A1A1A' },
  { id: 'cool-yellow', name: 'Cool Yellow', nameFr: 'Jaune Pastel', hex: '#FFF03A', legoId: 226, gobricksCode: 'GB-103', textColor: '#1A1A1A' },

  // Verts
  { id: 'bright-green', name: 'Bright Green', nameFr: 'Vert Vif', hex: '#4B9F4A', legoId: 37, gobricksCode: 'GB-036', textColor: '#FFFFFF' },
  { id: 'dark-green', name: 'Dark Green', nameFr: 'Vert Foncé', hex: '#237841', legoId: 28, gobricksCode: 'GB-006', textColor: '#FFFFFF' },
  { id: 'earth-green', name: 'Earth Green', nameFr: 'Vert Sapin', hex: '#184632', legoId: 141, gobricksCode: 'GB-080', textColor: '#FFFFFF' },
  { id: 'lime', name: 'Lime', nameFr: 'Vert Citron (Lime)', hex: '#BBE90B', legoId: 119, gobricksCode: 'GB-034', textColor: '#1A1A1A' },
  { id: 'bright-yellowish-green', name: 'Bright Yellowish Green', nameFr: 'Vert Pomme', hex: '#95B90B', legoId: 326, gobricksCode: 'GB-158', textColor: '#1A1A1A' },
  { id: 'olive-green', name: 'Olive Green', nameFr: 'Vert Olive', hex: '#9B9A5A', legoId: 330, gobricksCode: 'GB-155', textColor: '#1A1A1A' },
  { id: 'sand-green', name: 'Sand Green', nameFr: 'Vert Sable', hex: '#A0BCAC', legoId: 151, gobricksCode: 'GB-048', textColor: '#1A1A1A' },

  // Bleus
  { id: 'bright-blue', name: 'Bright Blue', nameFr: 'Bleu Vif', hex: '#0055BF', legoId: 23, gobricksCode: 'GB-007', textColor: '#FFFFFF' },
  { id: 'dark-blue', name: 'Dark Blue', nameFr: 'Bleu Foncé', hex: '#0A3463', legoId: 140, gobricksCode: 'GB-063', textColor: '#FFFFFF' },
  { id: 'medium-blue', name: 'Medium Blue', nameFr: 'Bleu Moyen', hex: '#5A93DB', legoId: 102, gobricksCode: 'GB-042', textColor: '#FFFFFF' },
  { id: 'medium-azure', name: 'Medium Azure', nameFr: 'Bleu Azur', hex: '#36AEBF', legoId: 322, gobricksCode: 'GB-156', textColor: '#1A1A1A' },
  { id: 'dark-azure', name: 'Dark Azure', nameFr: 'Azur Foncé', hex: '#078BC9', legoId: 321, gobricksCode: 'GB-153', textColor: '#FFFFFF' },
  { id: 'dark-turquoise', name: 'Dark Turquoise (Teal)', nameFr: 'Turquoise / Sarcelle', hex: '#008F9B', legoId: 107, gobricksCode: 'GB-039', textColor: '#FFFFFF' },
  { id: 'sand-blue', name: 'Sand Blue', nameFr: 'Bleu Sable', hex: '#6074A1', legoId: 135, gobricksCode: 'GB-055', textColor: '#FFFFFF' },

  // Violets & Roses
  { id: 'bright-purple', name: 'Bright Purple (Dark Pink)', nameFr: 'Rose Foncé / Magenta', hex: '#C870A0', legoId: 221, gobricksCode: 'GB-047', textColor: '#FFFFFF' },
  { id: 'light-purple', name: 'Light Purple (Bright Pink)', nameFr: 'Rose Vif', hex: '#E4ADC8', legoId: 222, gobricksCode: 'GB-104', textColor: '#1A1A1A' },
  { id: 'medium-lilac', name: 'Medium Lilac (Dark Purple)', nameFr: 'Violet Foncé', hex: '#3F3691', legoId: 268, gobricksCode: 'GB-089', textColor: '#FFFFFF' },
  { id: 'medium-lavender', name: 'Medium Lavender', nameFr: 'Lavande Moyen', hex: '#AC78BA', legoId: 324, gobricksCode: 'GB-157', textColor: '#FFFFFF' },
  { id: 'lavender', name: 'Lavender', nameFr: 'Lavande Clair', hex: '#E1D5ED', legoId: 325, gobricksCode: 'GB-154', textColor: '#1A1A1A' },

  // Neutres, Gris, Marrons & Métallisés
  { id: 'white', name: 'White', nameFr: 'Blanc', hex: '#FFFFFF', legoId: 1, gobricksCode: 'GB-001', textColor: '#1A1A1A' },
  { id: 'light-bluish-gray', name: 'Light Bluish Gray', nameFr: 'Gris Clair Bleuté', hex: '#A0A5A9', legoId: 194, gobricksCode: 'GB-086', textColor: '#1A1A1A' },
  { id: 'dark-bluish-gray', name: 'Dark Bluish Gray', nameFr: 'Gris Foncé Bleuté', hex: '#6C6E68', legoId: 199, gobricksCode: 'GB-085', textColor: '#FFFFFF' },
  { id: 'black', name: 'Black', nameFr: 'Noir', hex: '#1B2A34', legoId: 26, gobricksCode: 'GB-011', textColor: '#FFFFFF' },
  { id: 'brick-yellow', name: 'Brick Yellow (Tan)', nameFr: 'Beige (Tan)', hex: '#E4CD9E', legoId: 5, gobricksCode: 'GB-002', textColor: '#1A1A1A' },
  { id: 'sand-yellow', name: 'Sand Yellow (Dark Tan)', nameFr: 'Beige Foncé (Dark Tan)', hex: '#958A73', legoId: 138, gobricksCode: 'GB-069', textColor: '#FFFFFF' },
  { id: 'reddish-brown', name: 'Reddish Brown', nameFr: 'Marron Rougeâtre', hex: '#582A12', legoId: 192, gobricksCode: 'GB-088', textColor: '#FFFFFF' },
  { id: 'dark-brown', name: 'Dark Brown', nameFr: 'Marron Foncé', hex: '#352100', legoId: 308, gobricksCode: 'GB-120', textColor: '#FFFFFF' },
  { id: 'pearl-gold', name: 'Pearl Gold', nameFr: 'Or Nacré', hex: '#AA7F2E', legoId: 297, gobricksCode: 'GB-115', textColor: '#FFFFFF' },
  { id: 'flat-silver', name: 'Flat Silver', nameFr: 'Argent Métallisé', hex: '#898788', legoId: 315, gobricksCode: 'GB-095', textColor: '#FFFFFF' },
];
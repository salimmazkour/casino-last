import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svc = new Service({
  name: 'ERP-PrinterService',
  description: 'Service d\'impression automatique pour l\'ERP - Détection et gestion des imprimantes système',
  script: join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

svc.on('install', () => {
  console.log('✅ Service installé avec succès !');
  console.log('📌 Nom du service: ERP-PrinterService');
  console.log('🚀 Démarrage du service...');
  svc.start();
});

svc.on('start', () => {
  console.log('✅ Service démarré avec succès !');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Installation terminée !');
  console.log('');
  console.log('📌 Le service "ERP-PrinterService" est maintenant actif');
  console.log('🔄 Il démarre automatiquement avec Windows');
  console.log('📡 Accessible sur: http://localhost:3001');
  console.log('');
  console.log('🔧 Pour gérer le service:');
  console.log('   - Démarrer: services.msc → ERP-PrinterService → Démarrer');
  console.log('   - Arrêter: services.msc → ERP-PrinterService → Arrêter');
  console.log('   - Désinstaller: Double-cliquer sur "DESINSTALLER-SERVICE.bat"');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Appuyez sur une touche pour fermer...');
});

svc.on('alreadyinstalled', () => {
  console.log('⚠️  Le service est déjà installé !');
  console.log('');
  console.log('Pour réinstaller:');
  console.log('1. Exécutez DESINSTALLER-SERVICE.bat');
  console.log('2. Puis exécutez à nouveau INSTALLER-SERVICE.bat');
  console.log('');
  console.log('Appuyez sur une touche pour fermer...');
});

svc.on('error', (err) => {
  console.error('❌ Erreur lors de l\'installation:', err);
  console.log('');
  console.log('⚠️  Assurez-vous de:');
  console.log('   1. Exécuter en tant qu\'Administrateur');
  console.log('   2. Avoir Node.js installé');
  console.log('   3. Avoir exécuté "npm install" dans ce dossier');
  console.log('');
  console.log('Appuyez sur une touche pour fermer...');
});

console.log('🔧 Installation du service Windows...');
console.log('');
svc.install();

import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svc = new Service({
  name: 'ERP-PrinterService',
  script: join(__dirname, 'server.js')
});

svc.on('uninstall', () => {
  console.log('✅ Service désinstallé avec succès !');
  console.log('');
  console.log('Le service "ERP-PrinterService" a été supprimé.');
  console.log('');
  console.log('Appuyez sur une touche pour fermer...');
});

svc.on('error', (err) => {
  console.error('❌ Erreur lors de la désinstallation:', err);
  console.log('');
  console.log('Appuyez sur une touche pour fermer...');
});

console.log('🗑️  Désinstallation du service Windows...');
console.log('');
svc.uninstall();

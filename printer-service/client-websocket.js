import { io } from 'socket.io-client';
import pdfPrinter from 'pdf-to-printer';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { getPrinters, print } = pdfPrinter;
const execAsync = promisify(exec);

const ROUTER_URL = process.env.PRINT_ROUTER_URL || 'http://localhost:3002';
const CLIENT_ID = process.env.CLIENT_ID || `CLIENT_${os.hostname()}_${Date.now()}`;
const CLIENT_NAME = process.env.CLIENT_NAME || os.hostname();

let socket = null;
let printerMapping = {};
let isConnected = false;

console.log('╔═══════════════════════════════════════════════════╗');
console.log('║   🖨️  CLIENT D\'IMPRESSION - MODE WEBSOCKET       ║');
console.log('╚═══════════════════════════════════════════════════╝');
console.log('');
console.log(`📍 Client ID:   ${CLIENT_ID}`);
console.log(`🏷️  Client Name: ${CLIENT_NAME}`);
console.log(`🌐 Router URL:  ${ROUTER_URL}`);
console.log('');

function loadPrinterMapping() {
  const mappingPath = path.join(__dirname, 'printer-mapping.json');

  if (fs.existsSync(mappingPath)) {
    try {
      const data = fs.readFileSync(mappingPath, 'utf8');
      printerMapping = JSON.parse(data);
      console.log('✅ Mapping chargé:', Object.keys(printerMapping).length, 'entrée(s)');
      Object.entries(printerMapping).forEach(([logicalId, physicalName]) => {
        console.log(`   ${logicalId} → ${physicalName}`);
      });
      console.log('');
      return true;
    } catch (error) {
      console.error('⚠️  Erreur lecture mapping:', error.message);
      return false;
    }
  } else {
    console.log('⚠️  Aucun mapping trouvé (printer-mapping.json)');
    console.log('');
    return false;
  }
}

async function getSystemPrinters() {
  try {
    const printers = await getPrinters();
    return printers;
  } catch (error) {
    console.error('Erreur pdf-to-printer, tentative alternative...');

    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('wmic printer get name,default /format:csv');
        const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'));

        return lines.map(line => {
          const parts = line.split(',');
          const isDefault = parts[1] === 'TRUE';
          const name = parts[2]?.trim();

          return name ? {
            name,
            deviceId: name,
            default: isDefault
          } : null;
        }).filter(Boolean);
      } catch (wmicError) {
        console.error('Erreur WMIC:', wmicError);
        return [];
      }
    }

    return [];
  }
}

async function generateTicketPDF(orderData, templateType) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `ticket_${orderData.id}_${templateType}_${Date.now()}.pdf`;
  const filePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [226.77, 800], margin: 10 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(12).text(`Commande #${orderData.order_number || orderData.id}`, { align: 'center' });
    doc.fontSize(8).text(`Type: ${templateType}`, { align: 'center' });
    doc.moveDown();

    if (orderData.table_name) {
      doc.fontSize(10).text(`Table: ${orderData.table_name}`);
    }
    if (orderData.sales_point_name) {
      doc.fontSize(8).text(`Point de vente: ${orderData.sales_point_name}`);
    }
    doc.moveDown();

    doc.fontSize(8).text('Articles:', { underline: true });
    doc.moveDown(0.5);

    if (orderData.items && orderData.items.length > 0) {
      orderData.items.forEach(item => {
        doc.fontSize(8).text(`${item.quantity}x ${item.product_name}`, { continued: false });
        if (item.notes) {
          doc.fontSize(7).text(`   Note: ${item.notes}`);
        }
      });
    }

    doc.moveDown();
    doc.fontSize(8).text(`Total: ${orderData.total_amount || 0} FCFA`, { align: 'right' });
    doc.fontSize(7).text(new Date().toLocaleString('fr-FR'), { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function handlePrintJob(job) {
  try {
    console.log(`\n📄 [JOB] Reçu: ${job.job_id}`);
    console.log(`📝 Commande: #${job.order.order_number}`);
    console.log(`🖨️  Imprimante logique: ${job.printer.logical_id}`);

    const physicalPrinter = printerMapping[job.printer.logical_id];

    if (!physicalPrinter) {
      throw new Error(`Aucun mapping pour ${job.printer.logical_id}`);
    }

    console.log(`🖨️  Imprimante physique: ${physicalPrinter}`);

    const pdfPath = await generateTicketPDF(job.order, job.template.type);
    console.log(`📄 PDF généré: ${path.basename(pdfPath)}`);

    await print(pdfPath, { printer: physicalPrinter });
    console.log(`✅ Impression envoyée avec succès`);

    setTimeout(() => {
      try {
        fs.unlinkSync(pdfPath);
        console.log(`🗑️  Fichier temporaire supprimé`);
      } catch (err) {
        console.error('⚠️  Erreur suppression fichier:', err.message);
      }
    }, 5000);

    socket.emit('print_result', {
      job_id: job.job_id,
      success: true,
      message: 'Impression réussie'
    });

  } catch (error) {
    console.error(`❌ Erreur impression:`, error.message);

    socket.emit('print_result', {
      job_id: job.job_id,
      success: false,
      error: error.message
    });
  }
}

function connectToRouter() {
  console.log(`🔌 Connexion au router: ${ROUTER_URL}...`);

  socket = io(ROUTER_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  socket.on('connect', async () => {
    console.log('✅ Connecté au router!');
    console.log(`🔗 Socket ID: ${socket.id}`);
    isConnected = true;

    const printers = Object.entries(printerMapping).map(([logicalId, physicalName]) => ({
      logicalId,
      physicalName
    }));

    socket.emit('register', {
      client_id: CLIENT_ID,
      client_name: CLIENT_NAME,
      printers
    });
  });

  socket.on('registered', (data) => {
    console.log('✅ Enregistrement confirmé par le router');
    console.log(`📋 ${data.message}`);
    console.log('');
    console.log('🟢 Service prêt à recevoir des jobs d\'impression!');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  });

  socket.on('print_job', (job) => {
    handlePrintJob(job);
  });

  socket.on('disconnect', () => {
    console.log('❌ Déconnecté du router');
    isConnected = false;
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconnecté après ${attemptNumber} tentative(s)`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Tentative de reconnexion #${attemptNumber}...`);
  });

  socket.on('error', (error) => {
    console.error('❌ Erreur socket:', error.message);
  });

  setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat', { client_id: CLIENT_ID });
    }
  }, 30000);
}

async function main() {
  const hasMapping = loadPrinterMapping();

  if (!hasMapping || Object.keys(printerMapping).length === 0) {
    console.log('⚠️  AUCUN MAPPING CONFIGURÉ!');
    console.log('');
    console.log('📋 Imprimantes disponibles sur ce système:');
    const printers = await getSystemPrinters();
    printers.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name}`);
    });
    console.log('');
    console.log('⚙️  Veuillez créer printer-mapping.json avec le format:');
    console.log('{');
    console.log('  "CUISINE": "Nom de l\'imprimante physique",');
    console.log('  "BAR": "Nom de l\'imprimante physique"');
    console.log('}');
    console.log('');
    process.exit(1);
  }

  connectToRouter();
}

main();

process.on('SIGTERM', () => {
  console.log('\n[CLIENT] Arrêt du client...');
  if (socket) {
    socket.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n[CLIENT] Arrêt du client...');
  if (socket) {
    socket.disconnect();
  }
  process.exit(0);
});

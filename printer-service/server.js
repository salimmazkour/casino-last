import express from 'express';
import cors from 'cors';
import pdfPrinter from 'pdf-to-printer';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { getPrinters, print } = pdfPrinter;

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

console.log('🖨️  Démarrage du service d\'impression local...');
console.log('📡 Port:', PORT);
console.log('');

const printerMapping = {};

function loadPrinterMapping() {
  const mappingPath = path.join(__dirname, 'printer-mapping.json');

  if (fs.existsSync(mappingPath)) {
    try {
      const data = fs.readFileSync(mappingPath, 'utf8');
      const mapping = JSON.parse(data);
      Object.assign(printerMapping, mapping);
      console.log('✅ Mapping des imprimantes chargé:', Object.keys(printerMapping).length, 'entrée(s)');
      console.log('📋 Mappings:');
      Object.entries(printerMapping).forEach(([logicalId, physicalName]) => {
        console.log(`   ${logicalId} → ${physicalName}`);
      });
      console.log('');
    } catch (error) {
      console.error('⚠️  Erreur lecture mapping:', error.message);
    }
  } else {
    console.log('ℹ️  Aucun mapping trouvé (printer-mapping.json)');
  }
}

function savePrinterMapping() {
  const mappingPath = path.join(__dirname, 'printer-mapping.json');

  try {
    fs.writeFileSync(mappingPath, JSON.stringify(printerMapping, null, 2), 'utf8');
    console.log('✅ Mapping sauvegardé');
  } catch (error) {
    console.error('❌ Erreur sauvegarde mapping:', error.message);
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

app.get('/api/printers', async (req, res) => {
  try {
    console.log('📋 Requête de liste des imprimantes reçue');

    const printers = await getSystemPrinters();

    console.log(`✅ ${printers.length} imprimante(s) détectée(s):`);
    printers.forEach((p, index) => {
      const isDefault = p.default || p.isDefault || false;
      console.log(`   ${index + 1}. ${p.name} ${isDefault ? '⭐ (par défaut)' : ''}`);
    });
    console.log('');

    const printerList = printers.map(p => ({
      name: p.name,
      isDefault: p.default || p.isDefault || false,
      deviceId: p.deviceId || p.name
    }));

    res.json({
      success: true,
      count: printerList.length,
      printers: printerList
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des imprimantes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      printers: []
    });
  }
});

app.get('/api/mapping', (req, res) => {
  res.json({
    success: true,
    mapping: printerMapping
  });
});

app.post('/api/mapping', (req, res) => {
  try {
    const { logicalPrinterId, physicalPrinterName } = req.body;

    if (!logicalPrinterId || !physicalPrinterName) {
      return res.status(400).json({
        success: false,
        error: 'logicalPrinterId et physicalPrinterName requis'
      });
    }

    printerMapping[logicalPrinterId] = physicalPrinterName;
    savePrinterMapping();

    console.log(`✅ Mapping ajouté: ${logicalPrinterId} → ${physicalPrinterName}`);

    res.json({
      success: true,
      message: 'Mapping enregistré',
      mapping: printerMapping
    });
  } catch (error) {
    console.error('❌ Erreur ajout mapping:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'printer-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

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
    doc.fontSize(8).text(`Total: ${orderData.total_amount || 0} €`, { align: 'right' });
    doc.fontSize(7).text(new Date().toLocaleString('fr-FR'), { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

app.post('/api/print', async (req, res) => {
  try {
    const { order_id, sales_point_id, template_type } = req.body;

    if (!order_id || !template_type) {
      return res.status(400).json({
        success: false,
        error: 'order_id et template_type sont requis'
      });
    }

    console.log(`📝 Récupération commande #${order_id} pour ${template_type}...`);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          quantity,
          unit_price,
          notes,
          products (name)
        ),
        tables (name),
        sales_points (name)
      `)
      .eq('id', order_id)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Commande introuvable');

    const orderData = {
      id: order.id,
      order_number: order.order_number,
      table_name: order.tables?.name,
      sales_point_name: order.sales_points?.name,
      total_amount: order.total_amount,
      items: order.order_items.map(item => ({
        quantity: item.quantity,
        product_name: item.products?.name,
        notes: item.notes
      }))
    };

    console.log(`📄 Génération PDF pour ${template_type}...`);
    const pdfPath = await generateTicketPDF(orderData, template_type);

    const logicalPrinterId = template_type.replace('ticket_', '').toUpperCase();
    const physicalPrinter = printerMapping[logicalPrinterId];

    if (!physicalPrinter) {
      throw new Error(`Aucun mapping trouvé pour ${logicalPrinterId}`);
    }

    console.log(`🖨️  Impression sur: ${physicalPrinter} (${logicalPrinterId})`);
    console.log(`📄 Fichier: ${pdfPath}`);

    await print(pdfPath, { printer: physicalPrinter });

    setTimeout(() => {
      try {
        fs.unlinkSync(pdfPath);
        console.log(`🗑️  Fichier temporaire supprimé`);
      } catch (err) {
        console.error('⚠️  Erreur suppression fichier:', err.message);
      }
    }, 5000);

    console.log(`✅ Impression envoyée avec succès`);
    res.json({
      success: true,
      message: 'Impression envoyée avec succès',
      routing: {
        logical: logicalPrinterId,
        physical: physicalPrinter
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'impression:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

loadPrinterMapping();

app.listen(PORT, () => {
  console.log(`✅ Service d'impression démarré sur http://localhost:${PORT}`);
  console.log('');
  console.log('📌 Endpoints disponibles:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/printers`);
  console.log(`   GET  http://localhost:${PORT}/api/mapping`);
  console.log(`   POST http://localhost:${PORT}/api/mapping`);
  console.log(`   POST http://localhost:${PORT}/api/print`);
  console.log('');
  console.log('🔧 Pour arrêter le service: Ctrl+C');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  getSystemPrinters().then(printers => {
    console.log(`🖨️  ${printers.length} imprimante(s) disponible(s) sur ce système:`);
    printers.forEach((p, index) => {
      const isDefault = p.default || p.isDefault || false;
      console.log(`   ${index + 1}. ${p.name} ${isDefault ? '⭐ (défaut)' : ''}`);
    });
    console.log('');
  }).catch(error => {
    console.error('⚠️  Impossible de lister les imprimantes au démarrage:', error.message);
  });
});

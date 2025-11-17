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

async function generateTicketPDF(orderData, templateType, templateContent = {}) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileName = `ticket_${orderData.id}_${templateType}_${Date.now()}.pdf`;
  const filePath = path.join(tempDir, fileName);

  const paperSize = templateContent.paperSize || templateContent.paperWidth || '80mm';
  let pdfSize;
  let pdfMargin = 10;

  switch(paperSize) {
    case '58mm':
      pdfSize = [165, 800];
      break;
    case '80mm':
      pdfSize = [226.77, 800];
      break;
    case 'A6':
      pdfSize = 'A6';
      pdfMargin = 20;
      break;
    case 'A5':
      pdfSize = 'A5';
      pdfMargin = 30;
      break;
    case 'A4':
      pdfSize = 'A4';
      pdfMargin = 40;
      break;
    default:
      pdfSize = [226.77, 800];
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: pdfSize, margin: pdfMargin });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    if (templateContent.showLogo && templateContent.logoUrl) {
      try {
        if (templateContent.logoUrl.startsWith('data:image')) {
          const base64Data = templateContent.logoUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const logoAlign = templateContent.logoAlign || 'center';
          const logoWidth = 80;
          const pageWidth = doc.page.width;
          let xPos = doc.page.margins.left;

          if (logoAlign === 'center') {
            xPos = (pageWidth - logoWidth) / 2;
          } else if (logoAlign === 'right') {
            xPos = pageWidth - logoWidth - doc.page.margins.right;
          }

          const imgHeight = 80;
          doc.image(buffer, xPos, doc.y, { fit: [logoWidth, imgHeight] });
          doc.y += imgHeight + 10;
        }
      } catch (logoError) {
        console.error('⚠️ Erreur chargement logo:', logoError.message);
      }
    }

    if (templateContent.header) {
      const headerStyle = templateContent.textStyles?.header || { bold: true, size: 12, align: 'center' };
      const headerLines = templateContent.header.split('\n');
      headerLines.forEach(line => {
        const processedLine = line
          .replace(/\{\{order_number\}\}/g, orderData.order_number || orderData.id)
          .replace(/\{\{table\}\}/g, orderData.table_name || '')
          .replace(/\{\{client_name\}\}/g, orderData.client_name || '')
          .replace(/\{\{date\}\}/g, new Date().toLocaleString('fr-FR'))
          .replace(/\{\{total\}\}/g, `${orderData.total_amount || 0}€`)
          .replace(/\{\{pos\}\}/g, orderData.sales_point_name || '');
        doc.font(headerStyle.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(headerStyle.size || 12)
           .text(processedLine, { align: headerStyle.align || 'center' });
      });
      doc.moveDown();
    }

    doc.fontSize(10).text('================================', { align: 'center' });
    doc.moveDown(0.5);

    if (templateContent.showDate !== false) {
      doc.fontSize(8).text(`Date: ${new Date().toLocaleString('fr-FR')}`);
    }

    if (templateContent.showOrderNumber !== false) {
      doc.fontSize(9).text(`N° Commande: ${orderData.order_number || orderData.id}`);
    }

    if (templateContent.showTable !== false && orderData.table_name) {
      doc.fontSize(9).text(`Table: ${orderData.table_name}`);
    }

    if (templateContent.showClientName && orderData.client_name) {
      doc.fontSize(9).text(`Client: ${orderData.client_name}`);
    }

    doc.moveDown(0.5);
    doc.fontSize(10).text('================================', { align: 'center' });
    doc.moveDown(0.5);

    if (orderData.items && orderData.items.length > 0) {
      const showPrices = templateContent.showPrices !== false;
      const bodyStyle = templateContent.textStyles?.body || { bold: false, size: 10, align: 'left' };

      orderData.items.forEach(item => {
        const itemText = `${item.quantity}x ${item.product_name}`;

        if (showPrices) {
          const priceText = `${(item.quantity * (item.unit_price || 0)).toFixed(2)}€`;
          doc.font(bodyStyle.bold ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(bodyStyle.size || 10)
             .text(itemText, { continued: true });
          doc.text(priceText, { align: 'right' });
        } else {
          doc.font(bodyStyle.bold ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(bodyStyle.size || 10)
             .text(itemText, { align: bodyStyle.align || 'left' });
        }

        if (item.notes) {
          doc.font('Helvetica').fontSize(7).text(`   Note: ${item.notes}`);
        }
      });
    }

    doc.moveDown(0.5);
    doc.fontSize(10).text('================================', { align: 'center' });
    doc.moveDown(0.5);

    const showPrices = templateContent.showPrices !== false;
    if (showPrices) {
      doc.font('Helvetica-Bold').fontSize(12).text(`TOTAL: ${orderData.total_amount || 0}€`, { align: 'right' });
    }

    if (templateContent.footer) {
      doc.moveDown();
      doc.fontSize(10).text('================================', { align: 'center' });
      doc.moveDown(0.5);
      const footerStyle = templateContent.textStyles?.footer || { bold: false, size: 9, align: 'center' };
      const footerLines = templateContent.footer.split('\n');
      footerLines.forEach(line => {
        const processedLine = line
          .replace(/\{\{order_number\}\}/g, orderData.order_number || orderData.id)
          .replace(/\{\{table\}\}/g, orderData.table_name || '')
          .replace(/\{\{client_name\}\}/g, orderData.client_name || '')
          .replace(/\{\{date\}\}/g, new Date().toLocaleString('fr-FR'))
          .replace(/\{\{total\}\}/g, `${orderData.total_amount || 0}€`)
          .replace(/\{\{pos\}\}/g, orderData.sales_point_name || '');
        doc.font(footerStyle.bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(footerStyle.size || 9)
           .text(processedLine, { align: footerStyle.align || 'center' });
      });
    }

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
    console.log(`🏪 Point de vente ID: ${sales_point_id}`);

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
        restaurant_tables (table_number),
        sales_points (name),
        clients (first_name, last_name)
      `)
      .eq('id', order_id)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Commande introuvable');

    const { data: template, error: templateError } = await supabase
      .from('print_templates')
      .select(`
        template_content,
        printer_definition_id,
        printer_definitions!printer_definition_id (
          name,
          physical_printer_name,
          sales_point_id
        )
      `)
      .eq('template_type', template_type)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError) {
      console.warn(`⚠️ Erreur récupération template: ${templateError.message}`);
    }

    console.log('📋 Template récupéré:', JSON.stringify(template, null, 2));

    const templateContent = template?.template_content || {};

    const clientName = order.clients
      ? `${order.clients.first_name || ''} ${order.clients.last_name || ''}`.trim()
      : '';

    const orderData = {
      id: order.id,
      order_number: order.order_number,
      table_name: order.restaurant_tables?.table_number,
      sales_point_name: order.sales_points?.name,
      client_name: clientName,
      total_amount: order.total_amount,
      items: order.order_items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.products?.name,
        notes: item.notes
      }))
    };

    console.log(`📄 Génération PDF pour ${template_type}...`);
    const pdfPath = await generateTicketPDF(orderData, template_type, templateContent);

    if (!template || !template.printer_definitions) {
      throw new Error(`Aucune imprimante définie pour le template ${template_type}`);
    }

    const printerDef = template.printer_definitions;

    if (sales_point_id && printerDef.sales_point_id !== sales_point_id) {
      throw new Error(`L'imprimante définie pour ce template n'est pas associée au point de vente`);
    }

    const physicalPrinter = printerDef.physical_printer_name || printerDef.name;

    if (!physicalPrinter) {
      throw new Error(`Aucune imprimante physique définie pour ${template_type}`);
    }

    console.log(`🖨️  Impression sur: ${physicalPrinter} (Point de vente: ${printerDef.sales_point_id})`);
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
        template_type: template_type,
        physical: physicalPrinter,
        sales_point_id: printerDef.sales_point_id
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

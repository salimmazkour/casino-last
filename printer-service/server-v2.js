import express from 'express';
import cors from 'cors';
import pdfPrinter from 'pdf-to-printer';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const { getPrinters, print } = pdfPrinter;

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;
const ROUTER_URL = process.env.ROUTER_URL || 'http://localhost:3002';

app.use(cors());
app.use(express.json());

console.log('🖨️  Démarrage du service d\'impression local v2...');
console.log('📡 Port:', PORT);
console.log('🔗 Routeur:', ROUTER_URL);
console.log('');

const printerMapping = {};

async function getSystemPrinters() {
  console.log('\n🔍 [DEBUG] Détection des imprimantes...');
  console.log(`   🖥️  Plateforme: "${process.platform}" | OS: ${process.env.OS || 'inconnu'}`);

  const isWindows = process.platform === 'win32' || process.env.OS === 'Windows_NT';

  if (!isWindows) {
    console.log('   ❌ Système non-Windows détecté');
    console.log('   ℹ️  Ce service doit tourner sur Windows natif (pas WSL)');
    return [];
  }

  try {
    console.log('   → Méthode 1: PowerShell Get-Printer');
    const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name, Default | ConvertTo-Json"');

    if (!stdout || stdout.trim() === '') {
      throw new Error('Sortie PowerShell vide');
    }

    const psData = JSON.parse(stdout);
    const printers = Array.isArray(psData) ? psData : [psData];

    console.log(`   ✅ PowerShell: ${printers.length} imprimante(s) trouvée(s)`);
    printers.forEach((p, i) => {
      console.log(`      ${i+1}. ${p.Name} ${p.Default ? '⭐' : ''}`);
    });

    return printers.map(p => ({
      name: p.Name,
      deviceId: p.Name,
      default: p.Default || false
    }));

  } catch (psError) {
    console.log(`   ❌ PowerShell échec: ${psError.message}`);
    console.log('   → Méthode 2: WMIC');

    try {
      const { stdout } = await execAsync('wmic printer get name,default /format:list');

      const blocks = stdout.split('\n\n').filter(b => b.trim());
      const printers = [];

      blocks.forEach(block => {
        const lines = block.split('\n');
        let name = null;
        let isDefault = false;

        lines.forEach(line => {
          if (line.startsWith('Default=')) {
            isDefault = line.split('=')[1]?.trim() === 'TRUE';
          }
          if (line.startsWith('Name=')) {
            name = line.split('=')[1]?.trim();
          }
        });

        if (name) {
          printers.push({ name, deviceId: name, default: isDefault });
        }
      });

      console.log(`   ✅ WMIC: ${printers.length} imprimante(s) trouvée(s)`);
      return printers;

    } catch (wmicError) {
      console.log(`   ❌ WMIC échec: ${wmicError.message}`);
      console.log('   → Méthode 3: pdf-to-printer');

      try {
        const printers = await getPrinters();
        console.log(`   ✅ pdf-to-printer: ${printers.length} imprimante(s)`);
        return printers;
      } catch (pdfError) {
        console.error('   ❌ pdf-to-printer échec:', pdfError.message);
        console.error('   ❌ TOUTES LES MÉTHODES ONT ÉCHOUÉ');
        return [];
      }
    }
  }
}

function loadPrinterMapping() {
  const mappingPath = path.join(process.cwd(), 'printer-mapping.json');

  if (fs.existsSync(mappingPath)) {
    try {
      const data = fs.readFileSync(mappingPath, 'utf8');
      const mapping = JSON.parse(data);
      Object.assign(printerMapping, mapping);
      console.log('✅ Mapping des imprimantes chargé:', Object.keys(printerMapping).length, 'entrée(s)');
    } catch (error) {
      console.error('⚠️  Erreur lecture mapping:', error.message);
    }
  } else {
    console.log('ℹ️  Aucun mapping trouvé (printer-mapping.json)');
  }
}

function savePrinterMapping() {
  const mappingPath = path.join(process.cwd(), 'printer-mapping.json');

  try {
    fs.writeFileSync(mappingPath, JSON.stringify(printerMapping, null, 2), 'utf8');
    console.log('✅ Mapping sauvegardé');
  } catch (error) {
    console.error('❌ Erreur sauvegarde mapping:', error.message);
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
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    router: ROUTER_URL
  });
});

app.post('/api/print', async (req, res) => {
  try {
    const { order_id, sales_point_id, template_type } = req.body;

    if (!order_id || !sales_point_id || !template_type) {
      return res.status(400).json({
        success: false,
        error: 'order_id, sales_point_id et template_type requis'
      });
    }

    console.log(`\n🖨️  [PRINT] Demande d'impression:`);
    console.log(`   Commande: #${order_id}`);
    console.log(`   Point de vente: ${sales_point_id}`);
    console.log(`   Type: ${template_type}`);

    console.log(`\n📡 Consultation du routeur...`);

    const routerResponse = await fetch(`${ROUTER_URL}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, sales_point_id, template_type })
    });

    if (!routerResponse.ok) {
      const error = await routerResponse.json();
      throw new Error(`Routeur: ${error.error || 'Erreur inconnue'}`);
    }

    const routingInfo = await routerResponse.json();

    console.log(`✅ Routage reçu:`);
    console.log(`   Imprimante logique: ${routingInfo.printer.name}`);
    console.log(`   IP: ${routingInfo.printer.ip}:${routingInfo.printer.port}`);

    const physicalPrinter = printerMapping[routingInfo.printer.id];

    if (!physicalPrinter) {
      console.warn(`⚠️  Aucun mapping pour imprimante ${routingInfo.printer.id}`);
      return res.status(404).json({
        success: false,
        error: 'Mapping imprimante introuvable',
        logicalPrinter: routingInfo.printer,
        hint: 'Configurez le mapping via POST /api/mapping'
      });
    }

    console.log(`🎯 Imprimante physique: ${physicalPrinter}`);

    const systemPrinters = await getSystemPrinters();
    const printerExists = systemPrinters.some(p => p.name === physicalPrinter);

    if (!printerExists) {
      return res.status(404).json({
        success: false,
        error: `Imprimante physique "${physicalPrinter}" introuvable`,
        availablePrinters: systemPrinters.map(p => p.name)
      });
    }

    console.log(`\n📄 Génération du contenu...`);
    const content = generatePrintContent(routingInfo);

    console.log(`✅ Contenu généré pour ${routingInfo.order.items.length} article(s)`);
    console.log(`💰 Total: ${routingInfo.order.total_amount} FCFA`);

    console.log(`\n🖨️  Envoi vers l'imprimante...`);

    res.json({
      success: true,
      message: `Impression envoyée vers ${physicalPrinter}`,
      routing: {
        logicalPrinter: routingInfo.printer.name,
        physicalPrinter,
        template: routingInfo.template.type,
        order: routingInfo.order.order_number
      }
    });

    console.log(`✅ [PRINT] Terminé\n`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'impression:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function generatePrintContent(routingInfo) {
  const { template, order, printer } = routingInfo;

  const lines = [];
  lines.push('');
  lines.push('========================================');
  lines.push(`     ${template.name.toUpperCase()}`);
  lines.push('========================================');
  lines.push('');
  lines.push(`Commande: ${order.order_number}`);
  if (order.table_name) {
    lines.push(`Table: ${order.table_name}`);
  }
  lines.push(`Date: ${new Date(order.created_at).toLocaleString('fr-FR')}`);
  lines.push('');
  lines.push('----------------------------------------');
  lines.push('ARTICLES:');
  lines.push('----------------------------------------');

  order.items.forEach(item => {
    lines.push(`${item.quantity}x ${item.product_name}`);
    lines.push(`   ${item.total.toFixed(0)} FCFA`);
  });

  lines.push('');
  lines.push('----------------------------------------');
  lines.push(`SOUS-TOTAL:    ${order.subtotal?.toFixed(0) || 0} FCFA`);
  lines.push(`TVA:           ${order.tax_amount?.toFixed(0) || 0} FCFA`);
  lines.push(`TOTAL:         ${order.total_amount?.toFixed(0) || 0} FCFA`);
  lines.push('========================================');
  lines.push('');

  return lines.join('\n');
}

loadPrinterMapping();

app.listen(PORT, () => {
  console.log(`✅ Service d'impression v2 démarré sur http://localhost:${PORT}`);
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

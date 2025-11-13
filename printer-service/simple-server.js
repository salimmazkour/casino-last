import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const printerMapping = {
  '7cd5b2e5-1a73-494d-b603-7ea61e5c5189': 'Canon 1er Etage',
  '59ae340a-743c-4483-9a1f-47b387577666': 'Canon 1er Etage',
  '07544531-5923-4240-87a8-aba5debd3758': 'Canon 1er Etage'
};

console.log('🖨️  Service d\'impression simple démarré');
console.log('📋 Mappings:');
Object.entries(printerMapping).forEach(([logical, physical]) => {
  console.log(`   ${logical} → ${physical}`);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    printers: printerMapping
  });
});

app.get('/printers', async (req, res) => {
  try {
    const { stdout } = await execAsync('powershell -Command "Get-Printer | Select-Object Name | ConvertTo-Json"');
    const printers = JSON.parse(stdout);
    const list = Array.isArray(printers) ? printers : [printers];

    res.json({
      success: true,
      printers: list.map(p => p.Name)
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/mapping', (req, res) => {
  res.json({
    success: true,
    mapping: printerMapping
  });
});

app.post('/mapping', (req, res) => {
  const { logicalPrinterId, physicalPrinterName } = req.body;

  if (!logicalPrinterId || !physicalPrinterName) {
    return res.status(400).json({
      success: false,
      error: 'logicalPrinterId et physicalPrinterName requis'
    });
  }

  printerMapping[logicalPrinterId] = physicalPrinterName;
  console.log(`✅ Mapping: ${logicalPrinterId} → ${physicalPrinterName}`);

  res.json({
    success: true,
    mapping: printerMapping
  });
});

app.post('/print', async (req, res) => {
  try {
    const { printerId, templateHtml } = req.body;

    if (!printerId || !templateHtml) {
      return res.status(400).json({
        success: false,
        error: 'printerId et templateHtml requis'
      });
    }

    const physicalPrinter = printerMapping[printerId];

    if (!physicalPrinter) {
      return res.status(404).json({
        success: false,
        error: `Aucun mapping pour ${printerId}`,
        availableMappings: Object.keys(printerMapping)
      });
    }

    console.log(`🖨️  Impression: ${printerId} → ${physicalPrinter}`);

    const timestamp = Date.now();
    const tempTxtFile = path.join(__dirname, `temp_print_${timestamp}.txt`);

    const textContent = templateHtml
      .replace(/<div class="header">(.*?)<\/div>/g, '\n$1\n' + '='.repeat(40) + '\n')
      .replace(/<div class="line">(.*?)<\/div>/g, '$1\n')
      .replace(/<div class="separator"><\/div>/g, '-'.repeat(40) + '\n')
      .replace(/<div class="total">(.*?)<\/div>/g, '\n' + '='.repeat(40) + '\n$1\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    fs.writeFileSync(tempTxtFile, textContent, 'utf8');

    const printCmd = `powershell -Command "Get-Content '${tempTxtFile}' | Out-Printer -Name '${physicalPrinter}'"`;

    await execAsync(printCmd);

    setTimeout(() => {
      try {
        fs.unlinkSync(tempTxtFile);
      } catch (err) {
        console.error('⚠️  Erreur suppression fichier:', err.message);
      }
    }, 3000);

    console.log(`✅ Impression envoyée`);

    res.json({
      success: true,
      message: `Impression envoyée vers ${physicalPrinter}`
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Service prêt sur http://localhost:${PORT}`);
  console.log(`📌 Endpoints: /health, /printers, /mapping, /print`);
});

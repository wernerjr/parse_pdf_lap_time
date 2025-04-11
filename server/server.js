const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Importando a função de extração de dados de pilotos do parse-pdf.js
const { extractPilotData } = require('./parse-pdf-module');

const app = express();
const port = process.env.PORT || 3000;

// Configuração de CORS
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do diretório 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Garante que o diretório 'uploads' existe
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Aceita apenas arquivos PDF
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
    cb(null, true);
  }
});

// Rota para processar o upload do PDF
app.post('/parse-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
    }

    const filePath = req.file.path;
    
    // Lê o arquivo PDF e extrai o texto
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    
    // Extrai dados dos pilotos
    const pilots = extractPilotData(data.text);
    
    // Opcional: salva resultado em um arquivo JSON
    const outputPath = path.join(__dirname, 'results', `result-${Date.now()}.json`);
    
    // Certifica-se de que o diretório de resultados existe
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(pilots, null, 2));
    
    // Remove o arquivo temporário após o processamento
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: `PDF processado com sucesso. Extraídos dados de ${pilots.length} pilotos.`,
      pilots: pilots
    });
    
  } catch (error) {
    console.error('Erro ao processar o PDF:', error);
    res.status(500).json({ error: 'Erro ao processar o PDF', details: error.message });
  }
});

// Rota básica para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(`Acesse http://localhost:${port} para abrir a interface de upload de PDF`);
}); 
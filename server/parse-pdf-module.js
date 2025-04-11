const fs = require('fs');
const pdfParse = require('pdf-parse');

// Função para extrair dados dos pilotos
function extractPilotData(text) {
  const lines = text.split('\n').map(line => line.trim());
  const pilots = [];
  
  let currentPilot = null;
  let timeData = [];
  
  for (const line of lines) {
    if (!line) continue; // Ignora linhas vazias
    
    // Se estiver procurando um novo piloto
    if (!currentPilot) {
      // Regex para capturar número do kart e nome do piloto
      const match = line.match(/^(\d+)\s*([A-Z]+)/i);
      
      if (match) {
        const kartNumber = parseInt(match[1]);
        const pilotName = match[2].trim();
        
        // Processa os tempos na mesma linha do nome do piloto
        const lineWithoutSpaces = line.replace(/\s+/g, "");
        timeData = [];
        
        let tempLine = lineWithoutSpaces;
        // Extrai os últimos 4 tempos
        for (let i = 0; i < 4; i++) {
          timeData.push(tempLine.slice(-12));
          tempLine = tempLine.slice(0, -12);
        }
        
        // Extrai o tempo restante
        timeData.push(tempLine.split(pilotName)[1] || "");
        timeData.reverse();
        
        // Cria novo piloto
        currentPilot = {
          kartNumber,
          pilotName,
          laps: []
        };
        
        pilots.push(currentPilot);
      }
    } else {
      // Já encontrou um piloto, está processando suas voltas
      if (line.includes("MELHOR VOLTA")) {
        currentPilot = null; // Terminou este piloto
        continue;
      }
      
      if (!line.includes(" ")) {
        // Linha contendo apenas um tempo
        timeData.push(line);
        currentPilot.laps.push([...timeData]); // Cria uma cópia do array
        timeData = [];
      } else {
        // Linha com múltiplos tempos
        timeData = line.split(" ").filter(item => item); // Remove itens vazios
      }
    }
  }
  
  return pilots;
}

// Função para processar um arquivo PDF
async function processPdf(pdfPath, outputJsonPath) {
  try {
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    const pilots = extractPilotData(data.text);
    
    // Salva o JSON com os pilotos (opcional)
    if (outputJsonPath) {
      fs.writeFileSync(outputJsonPath, JSON.stringify(pilots, null, 2));
      console.log(`JSON gerado com ${pilots.length} pilotos em: ${outputJsonPath}`);
    }
    
    return pilots;
  } catch (error) {
    console.error('Erro ao processar o PDF:', error);
    throw error;
  }
}

module.exports = {
  extractPilotData,
  processPdf
}; 
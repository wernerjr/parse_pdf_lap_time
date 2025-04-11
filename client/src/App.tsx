import { useState } from 'react'
import './App.css'

// Definição dos tipos para o formato JSON retornado pela API
interface Lap {
  lapNumber: string;
  lapTime: string;
  gapBestLap: string;
  leaderLapGap: string;
  totalTime: string;
  averageSpeed: string;
}

interface Pilot {
  kartNumber: number;
  pilotName: string;
  laps: Lap[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  pilots: Pilot[];
}

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pdfFile) {
      setError('Por favor, selecione um arquivo PDF')
      return
    }

    setLoading(true)
    setError(null)
    setParsedData(null)
    setShowJson(false)

    try {
      const formData = new FormData()
      formData.append('pdf', pdfFile)

      const response = await fetch('http://localhost:3000/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Erro: ${response.status}`)
      }

      const data = await response.json()
      setParsedData(data)
    } catch (err) {
      setError(`Falha ao processar o PDF: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // Encontrar a melhor volta de um piloto
  const getBestLap = (laps: Lap[]): Lap | undefined => {
    if (!laps || laps.length === 0) return undefined;
    
    return laps.reduce((best, current) => {
      // Verifica se o lapTime é um formato válido
      if (!current.lapTime || !current.lapTime.includes(':')) return best;
      
      // Se ainda não temos uma melhor volta, esta é a melhor
      if (!best || !best.lapTime) return current;
      
      // Compara os tempos de volta
      return current.lapTime < best.lapTime ? current : best;
    }, undefined as Lap | undefined);
  };

  // Componente para renderizar um card de piloto
  const PilotCard = ({ pilot }: { pilot: Pilot }) => {
    const bestLap = getBestLap(pilot.laps);
    const lastLap = pilot.laps.length > 0 ? pilot.laps[pilot.laps.length - 1] : undefined;
    
    return (
      <div className="pilot-card">
        <div>
          <span className="pilot-number">{pilot.kartNumber}</span>
          <span className="pilot-name">{pilot.pilotName}</span>
        </div>
        
        <div className="pilot-info">
          <div className="info-item">
            <span className="info-label">Voltas</span>
            <span className="info-value">{pilot.laps.length}</span>
          </div>
          
          {bestLap && (
            <div className="info-item">
              <span className="info-label">Melhor volta</span>
              <span className="info-value">{bestLap.lapTime}</span>
            </div>
          )}
          
          {lastLap && (
            <div className="info-item">
              <span className="info-label">Última volta</span>
              <span className="info-value">{lastLap.lapTime}</span>
            </div>
          )}
          
          {bestLap && (
            <div className="info-item">
              <span className="info-label">Velocidade média</span>
              <span className="info-value">{bestLap.averageSpeed}</span>
            </div>
          )}
        </div>
        
        {pilot.laps.length > 0 && (
          <details className="laps-details">
            <summary>Ver histórico de voltas ({pilot.laps.length})</summary>
            <div className="laps-table-container">
              <table className="laps-table">
                <thead>
                  <tr>
                    <th>Volta</th>
                    <th>Tempo</th>
                    <th>Gap</th>
                    <th>Velocidade</th>
                  </tr>
                </thead>
                <tbody>
                  {pilot.laps.map((lap, index) => (
                    <tr key={index} className={bestLap && lap.lapTime === bestLap.lapTime ? 'best-lap' : ''}>
                      <td>{lap.lapNumber}</td>
                      <td>{lap.lapTime}</td>
                      <td>{lap.gapBestLap}</td>
                      <td>{lap.averageSpeed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>Processador de PDF</h1>
      
        <form onSubmit={handleSubmit}>
          <div className="file-input">
            <label htmlFor="pdf-file">Selecione um arquivo PDF:</label>
            <input 
              type="file" 
              id="pdf-file" 
              accept=".pdf" 
              onChange={handleFileChange} 
            />
          </div>
          
          <button type="submit" disabled={loading || !pdfFile}>
            {loading ? 'Processando...' : 'Enviar PDF'}
          </button>
        </form>
      </header>

      {error && <div className="error">{error}</div>}
      
      {loading && <div className="loading">Processando o PDF...</div>}
      
      {parsedData && parsedData.pilots && parsedData.pilots.length > 0 ? (
        <div className="results">
          <div className="results-header">
            <h2>
              Pilotos: {parsedData.pilots.length}
            </h2>
            {parsedData.message && (
              <div className="success-message">{parsedData.message}</div>
            )}
            <div className="actions">
              <button 
                onClick={() => setShowJson(!showJson)} 
                className="toggle-json-btn"
              >
                {showJson ? 'Ocultar JSON' : 'Ver JSON'}
              </button>
            </div>
          </div>
          
          {showJson ? (
            <pre className="json-preview">{JSON.stringify(parsedData, null, 2)}</pre>
          ) : (
            <div className="pilots-grid">
              {parsedData.pilots.map((pilot, index) => (
                <PilotCard key={index} pilot={pilot} />
              ))}
            </div>
          )}
        </div>
      ) : parsedData && (
        <div className="no-pilots">
          Nenhum piloto encontrado nos dados.
        </div>
      )}
    </div>
  )
}

export default App

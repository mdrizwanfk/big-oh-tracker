import { useState, useEffect } from 'react'
import './App.css'
import logo from '../../assets/flying-bird.png'

interface SavedState {
  hours: number
  minutes: number
  seconds: number
  state: 'idle' | 'running' | 'stopped'
  position: { x: number; y: number }
  lastSavedTimestamp?: number
}

interface StopwatchEntry {
  url: string
  key: string
  state: SavedState
}

function App() {
  const [stopwatches, setStopwatches] = useState<StopwatchEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStopwatches()

    // Listen for storage changes
    const handleStorageChange = (
      _: Record<string, any>,
      areaName: string,
    ) => {
      if (areaName === 'local') {
        loadStopwatches()
      }
    }

    if (typeof browser !== 'undefined' && browser.storage) {
      browser.storage.onChanged.addListener(handleStorageChange)

      return () => {
        browser.storage.onChanged.removeListener(handleStorageChange)
      }
    }
  }, [])

  const loadStopwatches = async () => {
    try {
      setLoading(true)

      if (typeof browser === 'undefined' || !browser?.storage?.local) {
        console.error('browser.storage.local is not available')
        setStopwatches([])
        return
      }

      // Get all items from storage
      const storage = browser.storage.local
      const allStorage = await storage.get(null)
      console.log('All storage keys:', Object.keys(allStorage))
      console.log('All storage:', allStorage)
      const allStopwatches: StopwatchEntry[] = []

      // Filter for stopwatch keys and extract data
      for (const [key, value] of Object.entries(allStorage)) {
        if (key.startsWith('stopwatch_')) {
          try {
            const url = key.replace('stopwatch_', '')

            if (value && typeof value === 'object' && 'hours' in value) {
              allStopwatches.push({
                url,
                key,
                state: value as SavedState,
              })
            } else {
              console.warn(`Invalid stopwatch data for key ${key}:`, value)
            }
          } catch (error) {
            console.error(`Error parsing stopwatch ${key}:`, error)
          }
        }
      }

      console.log('Found stopwatches:', allStopwatches.length, allStopwatches)
      setStopwatches(allStopwatches)
    } catch (error) {
      console.error('Error loading stopwatches:', error)
      setStopwatches([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (hours: number, minutes: number, seconds: number) => {
    const format = (n: number) => n.toString().padStart(2, '0')
    return `${format(hours)}:${format(minutes)}:${format(seconds)}`
  }

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname
    } catch {
      return url
    }
  }

  const getStateBadge = (state: string) => {
    const badges = {
      idle: 'bg-gray-500',
      running: 'bg-green-500',
      stopped: 'bg-yellow-500',
    }
    return badges[state as keyof typeof badges] || 'bg-gray-500'
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <div className="text-center mb-4">
        <img src={logo} className="mx-auto h-16 mb-2" alt="Big Oh!" />
        <h1 className="text-2xl font-bold">Big Oh!</h1>
        <p className="text-sm text-gray-600">A CS50 Tracker</p>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Stopwatches</h2>
          <button
            onClick={loadStopwatches}
            className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : stopwatches.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No stopwatches found
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stopwatches.map((sw, index) => (
              <div
                key={`${sw.key}-${index}`}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-2 h-2 rounded-full ${getStateBadge(sw.state.state)}`}
                        title={sw.state.state}
                      />
                      <span className="text-sm font-mono font-bold text-gray-900">
                        {formatTime(
                          sw.state.hours,
                          sw.state.minutes,
                          sw.state.seconds,
                        )}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {formatUrl(sw.url)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 capitalize">
                      {sw.state.state}
                    </div>
                  </div>
                  <a
                    href={sw.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-blue-500 hover:text-blue-700"
                  >
                    Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default App

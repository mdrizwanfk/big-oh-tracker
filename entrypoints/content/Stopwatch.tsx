import { useState, useEffect, useRef } from 'react'
import { RotateCcw, Play, Pause, Check } from 'lucide-react'

type StopwatchState = 'idle' | 'running' | 'stopped'

interface SavedState {
  hours: number
  minutes: number
  seconds: number
  state: StopwatchState
  position: { x: number; y: number }
  lastSavedTimestamp?: number
}

const Stopwatch = () => {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [state, setState] = useState<StopwatchState>('idle')
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const intervalRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSavedTimestampRef = useRef<number | null>(null)
  const isInitializedRef = useRef(false)
  const isUpdatingFromStorageRef = useRef(false)

  // Get storage key based on current URL
  const getStorageKey = () => {
    // TODO: create a key that is not url but just made of week number and problem name psets/[9/birthdays] just this part.
    return `stopwatch_${window.location.href}`
  }

  // Load state from browser.storage
  const loadState = async (): Promise<SavedState | null> => {
    try {
      const key = getStorageKey()
      const result = await browser.storage.local.get(key)
      if (result[key]) {
        return result[key] as SavedState
      }
    } catch (error) {
      console.error('Error loading state:', error)
    }
    return null
  }

  // Save state to browser.storage
  const saveState = async (currentState: {
    hours: number
    minutes: number
    seconds: number
    state: StopwatchState
    position: { x: number; y: number }
  }) => {
    try {
      const key = getStorageKey()
      const stateToSave: SavedState = {
        ...currentState,
        lastSavedTimestamp:
          currentState.state === 'running' ? Date.now() : undefined,
      }
      // Set flag to prevent listener from reacting to our own save
      isUpdatingFromStorageRef.current = true
      await browser.storage.local.set({ [key]: stateToSave })
      if (currentState.state === 'running') {
        lastSavedTimestampRef.current = Date.now()
      }
      // Reset flag after save completes
      setTimeout(() => {
        isUpdatingFromStorageRef.current = false
      }, 50)
    } catch (error) {
      console.error('Error saving state:', error)
      isUpdatingFromStorageRef.current = false
    }
  }

  // Initialize state from browser.storage on mount
  useEffect(() => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const initializeState = async () => {
      const saved = await loadState()
      let positionLoaded = false

      if (saved) {
        // Restore position
        if (saved.position.x !== 0 || saved.position.y !== 0) {
          setPosition(saved.position)
          positionLoaded = true
        }

        // Restore timer state
        if (saved.state === 'running' && saved.lastSavedTimestamp) {
          // Calculate elapsed time since last save
          const elapsedSeconds = Math.floor(
            (Date.now() - saved.lastSavedTimestamp) / 1000,
          )
          const totalSeconds =
            saved.hours * 3600 +
            saved.minutes * 60 +
            saved.seconds +
            elapsedSeconds

          const newHours = Math.floor(totalSeconds / 3600)
          const newMinutes = Math.floor((totalSeconds % 3600) / 60)
          const newSeconds = totalSeconds % 60

          setHours(newHours)
          setMinutes(newMinutes)
          setSeconds(newSeconds)
          setState('running')
          lastSavedTimestampRef.current = Date.now()
        } else {
          setHours(saved.hours)
          setMinutes(saved.minutes)
          setSeconds(saved.seconds)
          setState(saved.state)
        }
      }

      // Initialize position to top-right corner only if not loaded from storage
      if (!positionLoaded && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const defaultPosition = {
          x: window.innerWidth - rect.width - 20,
          y: 20,
        }
        setPosition(defaultPosition)
      }
    }

    initializeState()
  }, [])

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const key = getStorageKey()

    const handleStorageChange = (
      changes: Record<string, any>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[key]) return
      if (isUpdatingFromStorageRef.current) return // Prevent infinite loops

      const newValue = changes[key].newValue as SavedState | undefined
      if (!newValue) return

      isUpdatingFromStorageRef.current = true

      // Update position if changed
      if (
        newValue.position.x !== position.x ||
        newValue.position.y !== position.y
      ) {
        setPosition(newValue.position)
      }

      // Update timer state
      if (newValue.state !== state) {
        if (newValue.state === 'running' && newValue.lastSavedTimestamp) {
          // Calculate elapsed time since last save
          const elapsedSeconds = Math.floor(
            (Date.now() - newValue.lastSavedTimestamp) / 1000,
          )
          const totalSeconds =
            newValue.hours * 3600 +
            newValue.minutes * 60 +
            newValue.seconds +
            elapsedSeconds

          const newHours = Math.floor(totalSeconds / 3600)
          const newMinutes = Math.floor((totalSeconds % 3600) / 60)
          const newSeconds = totalSeconds % 60

          setHours(newHours)
          setMinutes(newMinutes)
          setSeconds(newSeconds)
          setState('running')
          lastSavedTimestampRef.current = Date.now()
        } else {
          // For idle/stopped states, use the saved values directly
          setHours(newValue.hours)
          setMinutes(newValue.minutes)
          setSeconds(newValue.seconds)
          setState(newValue.state)
        }
      } else if (
        newValue.hours !== hours ||
        newValue.minutes !== minutes ||
        newValue.seconds !== seconds
      ) {
        // Time values changed but state didn't (shouldn't happen often, but handle it)
        if (newValue.state === 'running' && newValue.lastSavedTimestamp) {
          // Recalculate if running
          const elapsedSeconds = Math.floor(
            (Date.now() - newValue.lastSavedTimestamp) / 1000,
          )
          const totalSeconds =
            newValue.hours * 3600 +
            newValue.minutes * 60 +
            newValue.seconds +
            elapsedSeconds

          const newHours = Math.floor(totalSeconds / 3600)
          const newMinutes = Math.floor((totalSeconds % 3600) / 60)
          const newSeconds = totalSeconds % 60

          setHours(newHours)
          setMinutes(newMinutes)
          setSeconds(newSeconds)
        } else {
          setHours(newValue.hours)
          setMinutes(newValue.minutes)
          setSeconds(newValue.seconds)
        }
      }

      // Reset flag after a short delay to allow state updates
      setTimeout(() => {
        isUpdatingFromStorageRef.current = false
      }, 100)
    }

    browser.storage.onChanged.addListener(handleStorageChange)

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [state, hours, minutes, seconds, position])

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prevSec) => {
          if (prevSec >= 59) {
            setMinutes((prevMin) => {
              if (prevMin >= 59) {
                setHours((prevHour) => prevHour + 1)
                return 0
              }
              return prevMin + 1
            })
            return 0
          }
          return prevSec + 1
        })
      }, 1000) // Update every 1 second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state])

  // Save state whenever it changes (but not on every second)
  useEffect(() => {
    if (!isInitializedRef.current) return

    saveState({
      hours,
      minutes,
      seconds,
      state,
      position,
    }).catch((error) => {
      console.error('Error saving state in effect:', error)
    })
  }, [hours, minutes, state, position])

  const handleStart = () => {
    setState('running')
  }

  const handleStop = () => {
    setState('stopped')
  }

  const handleReset = () => {
    setState('idle')
    setHours(0)
    setMinutes(0)
    setSeconds(0)
  }

  const handleComplete = () => {
    setState('idle')
    setHours(0)
    setMinutes(0)
    setSeconds(0)
  }

  const formatTime = (value: number, digits: number = 2) => {
    return value.toString().padStart(digits, '0')
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't drag if clicking on a button or its children
    const target = e.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setIsDragging(true)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        // Constrain to viewport bounds
        const maxX =
          window.innerWidth - (containerRef.current?.offsetWidth || 0)
        const maxY =
          window.innerHeight - (containerRef.current?.offsetHeight || 0)

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY)),
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={containerRef}
      className="fixed z- pointer-events-auto cursor-move select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        className="bg-white rounded-xl shadow-2xl p-3 min-w-[140px] cursor-grab active:cursor-grabbing"
      >
        {/* Time Display */}
        <div className="text-2xl font-mono font-bold text-gray-900 text-center mb-3 tracking-wider">
          {formatTime(hours)} : {formatTime(minutes)} : {formatTime(seconds)}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          {/* Reset Button */}
          <button
            onClick={handleReset}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Start/Stop Button */}
          {state === 'idle' || state === 'stopped' ? (
            <button
              onClick={handleStart}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              title="Start"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleStop}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="Complete"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Stopwatch

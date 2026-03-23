import { useState, useEffect, useMemo } from 'react';
import { fetchSprints, fetchSprintTasks } from './services/azureDevops';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import './App.css';

function App() {
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterType, setFilterType] = useState('');

  // 1. Load Sprints on mount
  useEffect(() => {
    const initSprints = async () => {
      try {
        const sprintData = await fetchSprints();
        setSprints(sprintData);
        if (sprintData.length > 0) {
          // Default to the first sprint (or current one if we had logic)
          setSelectedSprint(sprintData[0].path);
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    initSprints();
  }, []);

  // 2. Load Tasks when Sprint changes
  useEffect(() => {
    if (!selectedSprint) return;

    const loadTasks = async () => {
      try {
        setLoading(true);
        const data = await fetchSprintTasks(selectedSprint);
        setTasks(data);
        setLoading(false);
      } catch (err) {
        if (err.message.includes('Azure DevOps PAT is missing')) {
          setTasks([
            { id: 101, title: 'Mock Story', type: 'User Story', state: 'Active', assignedTo: 'Rameswar', effort: 5 },
          ]);
          setError('Running in Demo Mode: Azure DevOps PAT is missing.');
          setLoading(false);
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadTasks();
  }, [selectedSprint]);

  // Derived state for filters
  const assignees = useMemo(() => {
    const list = tasks.map(t => t.assignedTo);
    return [...new Set(list)];
  }, [tasks]);

  const types = useMemo(() => {
    const list = tasks.map(t => t.type);
    return [...new Set(list)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchAssignee = filterAssignee ? t.assignedTo === filterAssignee : true;
      const matchType = filterType ? t.type === filterType : true;
      return matchAssignee && matchType;
    });
  }, [tasks, filterAssignee, filterType]);

  const onTaskUpdate = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass">
        <div className="header-content">
          <div className="logo">RamAI Workspace</div>
          <h1>Velocity Dashboard</h1>
          <p className="subtitle">Filter tasks, adjust story points, and generate AI Prompts instantly.</p>
        </div>
      </header>

      {error && (
        <div className="banner warning glass">
          <span className="icon">⚠️</span> {error}
        </div>
      )}

      <div className="controls-bar glass">
        <div className="control-group">
          <label>Sprint</label>
          <select
            value={selectedSprint || ''}
            onChange={(e) => setSelectedSprint(e.target.value)}
            disabled={sprints.length === 0}
          >
            {sprints.map(s => (
              <option key={s.id} value={s.path}>{s.name} ({s.timeframe})</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Assignee</label>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="">All Developers</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="control-group">
          <label>Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <main className="dashboard-main">
        {loading ? (
          <div className="loader">
            <div className="spinner"></div>
            <p>Fetching sprint data...</p>
          </div>
        ) : (
          <div className="task-grid">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => setSelectedTask(task)}
              />
            ))}
            {filteredTasks.length === 0 && (
              <div className="empty-state">No tasks found for these filters.</div>
            )}
          </div>
        )}
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
}

export default App;

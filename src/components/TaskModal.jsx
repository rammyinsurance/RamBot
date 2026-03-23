import { useState, useEffect } from 'react';
import { explainTaskToDeveloper, generateUIFilesCode } from '../services/openai';
import { updateTaskDetails } from '../services/azureDevops';
import './TaskModal.css';

const TaskModal = ({ task, onClose, onUpdate }) => {
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [effort, setEffort] = useState(task.effort);
    const [state, setState] = useState(task.state);
    const [savingDetails, setSavingDetails] = useState(false);

    // New features state
    const [fabricatorPath, setFabricatorPath] = useState('fabricator/src/ui/' + (task.id || 'new_task'));
    const [generatingUI, setGeneratingUI] = useState(false);
    const [pushingGit, setPushingGit] = useState(false);
    const [actionMessage, setActionMessage] = useState('');

    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                setLoading(true);
                if (!import.meta.env.VITE_OPENAI_API_KEY) {
                    setTimeout(() => {
                        setExplanation("## Demo Mode\nRunning without OpenAI Key...");
                        setLoading(false);
                    }, 1000);
                    return;
                }

                const expl = await explainTaskToDeveloper(task);
                setExplanation(expl);
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        if (task) fetchExplanation();
    }, [task]);

    const handleUpdateDetails = async () => {
        try {
            setSavingDetails(true);
            const updates = { effort, state };
            const newDetails = await updateTaskDetails(task.id, updates);
            onUpdate({ ...task, effort: newDetails.effort, state: newDetails.state });
            setSavingDetails(false);
        } catch (err) {
            alert('Error updating task: ' + err.message);
            setSavingDetails(false);
        }
    };

    const copyPrompt = async () => {
        const promptText = `
I need you to generate a modern UI for the following task using HTML, CSS, and Javascript.
We are using the "Fabricator" framework.

Task Title: ${task.title}
Task Type: ${task.type}
Description:
${task.description}

STRICT REQUIREMENTS:
1. Use Bootstrap grid system carefully (containers, rows, cols).
2. Explicitly specify relative font sizes (rem/em), a modern typography font, and professional, crisp color schemes.
3. Keep the HTML semantic.
4. Include any necessary CSS for micro-animations or modern glassmorphism if applicable.
5. Provide a step-by-step breakdown BEFORE providing the code.
    `.trim();

        try {
            await navigator.clipboard.writeText(promptText);
            alert('Advanced AI Prompt Copied to Clipboard!');
        } catch (err) {
            alert('Failed to copy: ' + err.message);
        }
    };

    const handleGenerateUI = async () => {
        try {
            setGeneratingUI(true);
            setActionMessage('Generating HTML/CSS/JS via AI...');

            const filesPayload = await generateUIFilesCode(task);

            setActionMessage('Writing files to disk...');
            const res = await fetch('/api/generate-ui', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderPath: fabricatorPath,
                    ...filesPayload
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');

            setActionMessage('Files generated successfully! ✨');
            setTimeout(() => setActionMessage(''), 3000);
        } catch (err) {
            alert('Failed to generate UI: ' + err.message);
            setActionMessage('');
        } finally {
            setGeneratingUI(false);
        }
    };

    const handleGitPush = async () => {
        try {
            setPushingGit(true);
            setActionMessage('Staging and pushing to new feature branch...');

            const res = await fetch('/api/git-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    folderPath: fabricatorPath
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Git operation failed');

            setActionMessage(`Pushed successfully to ${data.branch} 🚀`);
            setTimeout(() => setActionMessage(''), 5000);
        } catch (err) {
            alert('Failed to push: ' + err.message);
            setActionMessage('');
        } finally {
            setPushingGit(false);
        }
    };

    if (!task) return null;
    const hasChanges = (effort != task.effort) || (state !== task.state);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>✕</button>

                <div className="modal-header">
                    <div className="header-left">
                        <span className="pulse-dot"></span>
                        <h2>{task.title}</h2>
                        <span className="task-ref">#{task.id}</span>
                    </div>

                    <div className="points-editor">
                        <select value={state} onChange={(e) => setState(e.target.value)} className="state-select">
                            <option value="New">New</option>
                            <option value="To Do">To Do</option>
                            <option value="Doing">Doing</option>
                            <option value="Active">Active</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                            <option value="Done">Done</option>
                        </select>
                        <div className="effort-divider"></div>
                        <label>Effort:</label>
                        <input
                            type="number" value={effort} onChange={(e) => setEffort(e.target.value)} className="points-input"
                        />
                        <button className="btn btn-points" onClick={handleUpdateDetails} disabled={savingDetails || !hasChanges}>
                            {savingDetails ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="section-title">AI Developer Brief</div>
                    {loading ? (
                        <div className="ai-loader">
                            <div className="ai-spinner"></div>
                            <p>Analyzing requirements and generating brief...</p>
                        </div>
                    ) : error ? (
                        <div className="ai-error"><code>{error}</code></div>
                    ) : (
                        <div className="explanation-text markdown-body">
                            {explanation.split('\n').map((line, idx) => {
                                if (line.startsWith('#')) return <strong key={idx}>{line.replace(/#/g, '')}<br /></strong>;
                                if (line.trim() === '') return <br key={idx} />;
                                return <span key={idx}>{line}<br /></span>;
                            })}
                        </div>
                    )}
                </div>

                {/* Automation Panel */}
                <div className="automation-panel">
                    <div className="automation-inputs">
                        <label>Target Folder Path (Fabricator):</label>
                        <input
                            type="text"
                            className="path-input glass"
                            value={fabricatorPath}
                            onChange={(e) => setFabricatorPath(e.target.value)}
                        />
                    </div>
                    {actionMessage && <div className="action-status">{actionMessage}</div>}
                    <div className="automation-actions">
                        <button className="btn btn-generate" onClick={handleGenerateUI} disabled={generatingUI}>
                            {generatingUI ? '⚙️ Generating...' : '✨ Generate UI Files'}
                        </button>
                        <button className="btn btn-git" onClick={handleGitPush} disabled={pushingGit}>
                            {pushingGit ? '📤 Pushing...' : '🪴 Branch & Push'}
                        </button>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={copyPrompt}>
                        📋 Copy Prompt
                    </button>
                    <a href={task.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        View in DevOps
                    </a>
                </div>
            </div>
        </div>
    );
};

export default TaskModal;

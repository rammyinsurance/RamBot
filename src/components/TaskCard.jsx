import './TaskCard.css';

const TaskCard = ({ task, onClick }) => {
    const getTypeColor = (type) => {
        switch (type) {
            case 'Bug': return 'var(--danger-color)';
            case 'User Story': return 'var(--primary-color)';
            case 'Task': return 'var(--accent-color)';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusIcon = (state) => {
        switch (state) {
            case 'New': return '🔵';
            case 'To Do': return '🔵';
            case 'Active': return '🟡';
            case 'Doing': return '🟡';
            case 'Resolved': return '🟢';
            case 'Closed': return '✔️';
            case 'Done': return '✔️';
            default: return '⚪';
        }
    };

    return (
        <div className="task-card glass interactive" onClick={onClick}>
            <div className="task-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="task-id">#{task.id}</span>
                    <span
                        className="task-type"
                        style={{ backgroundColor: getTypeColor(task.type) + '20', color: getTypeColor(task.type), border: `1px solid ${getTypeColor(task.type)}50` }}
                    >
                        {task.type}
                    </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }} title="Effort">
                    ⭐ {task.effort === undefined ? task.storyPoints : task.effort || 0}
                </div>
            </div>

            <h3 className="task-title">{task.title}</h3>

            <div className="task-footer">
                <div className="assignee">
                    <div className="avatar">
                        {task.assignedTo.charAt(0).toUpperCase()}
                    </div>
                    <span className="name">{task.assignedTo}</span>
                </div>
                <div className="status" title={`Status: ${task.state}`}>
                    {getStatusIcon(task.state)} {task.state}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;

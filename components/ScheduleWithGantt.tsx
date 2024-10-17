import React, { useEffect, useRef, useState } from 'react';
import gantt from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import 'dhtmlx-scheduler/codebase/dhtmlxscheduler.css';
import scheduler from 'dhtmlx-scheduler';
import styles from '@/styles/ScheduleWithGantt.module.css';

interface Task {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
}

interface Milestone {
  phase: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ScheduleWithGanttProps {
  milestones: Milestone[];
  projectName: string;
}

// Helper function to format dates into DD-MM-YYYY format
const formatDateForGantt = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const ScheduleWithGantt = ({ milestones, projectName }: ScheduleWithGanttProps) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const schedulerRef = useRef<HTMLDivElement>(null);

  // Transform the milestones into DHTMLX Gantt's task format
  const tasks = {
    data: milestones.map((milestone, index) => ({
      id: index + 1,
      text: milestone.phase,
      start_date: formatDateForGantt(milestone.startDate),
      end_date: formatDateForGantt(milestone.endDate),
    })),
  };

  const events = milestones.map((milestone, index) => ({
    id: index + 1,
    text: milestone.phase,
    start_date: milestone.startDate,
    end_date: milestone.endDate,
  }));

  // Function to update the timescale based on viewMode
  const setGanttView = (mode: 'day' | 'week' | 'month') => {
    switch (mode) {
      case 'day':
        gantt.config.scale_unit = 'day';
        gantt.config.date_scale = '%d %M';
        gantt.config.subscales = [{ unit: 'hour', step: 1, date: '%H:%i' }];
        break;
      case 'week':
        gantt.config.scale_unit = 'week';
        gantt.config.date_scale = 'Week #%W';
        gantt.config.subscales = [{ unit: 'day', step: 1, date: '%d %M' }];
        break;
      case 'month':
        gantt.config.scale_unit = 'month';
        gantt.config.date_scale = '%F %Y';
        gantt.config.subscales = [{ unit: 'week', step: 1, date: 'Week #%W' }];
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && ganttRef.current) {
      gantt.init(ganttRef.current);
      gantt.parse(tasks);
    }

    return () => {
      if (typeof window !== 'undefined') {
        gantt.clearAll();
      }
    };
  }, [tasks]);

  useEffect(() => {
    if (typeof window !== 'undefined' && schedulerRef.current) {
      scheduler.init(schedulerRef.current, new Date(), 'month');
      scheduler.clearAll();
      scheduler.parse(events, 'json');
    }

    return () => {
      if (typeof window !== 'undefined') {
        scheduler.clearAll();
      }
    };
  }, [events]);

  return (
    <div>
      {/* Text breakdown section */}
      <div className={styles.projectName}>
        <h2>Project: {projectName}</h2>
      </div>
      <div className={styles.breakdown}>
        <h2>Production Schedule Breakdown</h2>
        <ul>
          {milestones.map((milestone, index) => (
            <li key={index}>
              <strong>{milestone.phase}</strong>: {milestone.startDate} to {milestone.endDate}
              <p>{milestone.description}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Toggle buttons for Gantt chart view mode */}
      <div className={styles.viewModeToggle}>
        <button onClick={() => setViewMode('day')}>Day View</button>
        <button onClick={() => setViewMode('week')}>Week View</button>
        <button onClick={() => setViewMode('month')}>Month View</button>
      </div>

      {/* Divider between breakdown and Gantt chart */}
      <div className={styles.divider}></div>

      {/* Gantt chart section */}
      <div className={styles.ganttContainer}>
        <h2>Gantt Chart</h2>
        <div ref={ganttRef} style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Scheduler (calendar) container */}
      <div className={styles.schedulerContainer}>
        <h2>Calendar View</h2>
        <div ref={schedulerRef} style={{ width: '100%', height: '600px' }} />
      </div>
    </div>
  );
};

export default ScheduleWithGantt;

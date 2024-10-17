'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic'; // Import dynamic for dynamic loading
import styles from '@/styles/scheduler.module.css';

// Dynamically import ScheduleWithGantt with SSR disabled
const ScheduleWithGantt = dynamic(() => import('@/components/ScheduleWithGantt'), { ssr: false });

interface Schedule {
  id: string;
  name: string;
  created_at: string;
  schedule_data: any;
}

const ScheduleGenerator = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : '';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); // State to manage the dropdown menu

  // Fetch all schedules for the user on component mount
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch(`/api/saveScheduleToPg?userId=${userId}`);
        const result = await response.json();
  
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch schedules');
        }
  
        setSchedules(result.schedules); // Store the fetched schedules
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    };
  
    if (userId) {
      fetchSchedules(); // Only fetch schedules if userId is available
    }
  }, [userId]);

  // Handle schedule selection from dropdown
  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule); // Set the selected schedule
    setMenuOpen(false); // Close the menu after selecting a schedule
  };

  const handleMouseLeave = () => {
    setMenuOpen(false);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Fixed Header */}
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Project Scheduler</h1>
        <div className={styles.menuWrapper}>
          <button onClick={() => setMenuOpen(!menuOpen)} className={styles.menuButton}>
            Select a Project
          </button>
          {menuOpen && (
            <ul className={styles.dropdownMenu} onMouseLeave={handleMouseLeave}>
              {schedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className={styles.menuItem}
                  onClick={() => handleScheduleClick(schedule)}
                >
                  {schedule.name} ({new Date(schedule.created_at).toLocaleDateString()})
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {/* Main content area to display the selected schedule */}
      <main className={styles.mainContent}>
        {selectedSchedule ? (
          <>
            {/* Gantt chart for the selected schedule */}
            <ScheduleWithGantt milestones={selectedSchedule.schedule_data} projectName={selectedSchedule.name} />
          </>
        ) : (
          <p>Please select a schedule from the menu to view the details.</p>
        )}
      </main>
    </div>
  );
};

export default ScheduleGenerator;

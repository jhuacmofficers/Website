import React, { memo } from 'react';

interface EventsContainerProps<T> {
  title: string;
  upcomingTitle: string;
  pastTitle: string;
  upcomingItems: T[];
  pastItems: T[];
  renderUpcomingItem: (item: T, index: number) => React.ReactNode;
  renderPastItem: (item: T, index: number) => React.ReactNode;
}

const EventsContainer = memo(<T,>({
  title,
  upcomingTitle,
  pastTitle,
  upcomingItems,
  pastItems,
  renderUpcomingItem,
  renderPastItem,
}: EventsContainerProps<T>) => {
  return (
    <div className="profile-section">
      <h2 className="section-title">{title}</h2>
      <div className="section-block">
        <h3 className="section-subtitle">{upcomingTitle}</h3>
        {upcomingItems.length > 0 ? (
          <div className="grid-gap-10">
            {upcomingItems.map((item, index) => (
              <React.Fragment key={index}>{renderUpcomingItem(item, index)}</React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-muted">No {upcomingTitle.toLowerCase()}</p>
        )}
      </div>
      <div>
        <h3 className="section-subtitle">{pastTitle}</h3>
        {pastItems.length > 0 ? (
          <div className="grid-gap-10">
            {pastItems.map((item, index) => (
              <React.Fragment key={index}>{renderPastItem(item, index)}</React.Fragment>
            ))}
          </div>
        ) : (
          <p className="text-muted">No {pastTitle.toLowerCase()}</p>
        )}
      </div>
    </div>
  );
});

EventsContainer.displayName = 'EventsContainer';

export default EventsContainer;

import React, { useEffect } from 'react';
import { useGroupStore } from '../store/useGroupStore';

const GroupList = () => {
  const { groups, getGroups, setSelectedGroup } = useGroupStore();

  useEffect(() => {
    getGroups();
  }, [getGroups]);

  return (
    <div>
      <h2>Groups</h2>
      <ul>
        {groups.map((group) => (
          <li key={group._id} onClick={() => setSelectedGroup(group)}>
            {group.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GroupList; 
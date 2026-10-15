import { useContext } from 'react';
import { StudentContext } from './StudentContext';

/**
 * Dedicated hook for consuming StudentContext.
 * Separated to satisfy React Fast Refresh compatibility rules.
 */
export const useStudent = () => useContext(StudentContext);
export default useStudent;

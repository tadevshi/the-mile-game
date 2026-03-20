import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateEventPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/wizard/new', { replace: true });
  }, [navigate]);

  return null;
}

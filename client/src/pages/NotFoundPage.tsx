import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="container-page py-20">
      <EmptyState
        title="Page not found"
        description="That link does not exist, or the product may have been removed."
        action={
          <Link to="/" className="btn-primary">
            Back to home
          </Link>
        }
      />
    </div>
  );
}

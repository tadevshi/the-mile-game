import { Navigate, useLocation, useParams } from 'react-router-dom';

/** Keep bookmarked admin URLs useful without carrying unknown suffixes into a 404. */
export function AdminLegacyRedirect() {
  const { slug, '*': suffix = '' } = useParams();
  const { search, hash } = useLocation();
  const editor = suffix.replace(/\/+$/, '');
  const editorPath = editor === 'questions' || editor === 'theme' ? `/${editor}` : '';
  const pathname = slug ? `/e/${encodeURIComponent(slug)}/admin${editorPath}` : '/dashboard';

  return <Navigate to={{ pathname, search, hash }} replace />;
}

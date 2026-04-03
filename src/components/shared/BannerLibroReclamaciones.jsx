import { Link } from 'react-router-dom';

// variant: 'dark' para fondos oscuros (icono blanco), 'light' para fondos claros (icono gris)
const BannerLibroReclamaciones = ({ variant = 'light' }) => {
  const colorCls = variant === 'dark'
    ? 'text-white/60 hover:text-white'
    : 'text-gray-400 hover:text-black';

  return (
    <Link
      to="/libro-reclamaciones"
      className={`absolute bottom-4 right-4 flex flex-col items-center gap-1 transition-colors ${colorCls}`}
      title="Libro de Reclamaciones"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <span className="text-[9px] font-medium uppercase tracking-wider leading-tight text-center">Libro de<br/>Reclamaciones</span>
    </Link>
  );
};

export default BannerLibroReclamaciones;

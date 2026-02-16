const BadgeSocio = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 border border-yellow-400 text-[10px] font-bold uppercase tracking-widest text-yellow-800 bg-yellow-50 ${className}`}
    >
      SOCIO
    </span>
  );
};

export default BadgeSocio;

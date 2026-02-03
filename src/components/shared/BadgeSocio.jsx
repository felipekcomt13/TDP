const BadgeSocio = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border border-black text-[10px] font-semibold uppercase tracking-widest text-black bg-white ${className}`}
    >
      SOCIO
    </span>
  );
};

export default BadgeSocio;

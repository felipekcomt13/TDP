const BadgeSocio = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 border border-yellow-400 text-[10px] font-semibold text-yellow-800 bg-yellow-50 rounded-full ${className}`}
    >
      Socio
    </span>
  );
};

export default BadgeSocio;

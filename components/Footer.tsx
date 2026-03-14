const Footer = () => {
  return (
    <footer className="no-print border-t border-apple-mist bg-white py-6">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
        <p className="text-xs text-apple-steel">
          (c) {new Date().getFullYear()} Prodisenyo - Automated Payroll System
        </p>
        <p className="text-xs text-apple-steel">
          All data is processed locally - No server uploads - Private by design
        </p>
      </div>
    </footer>
  );
};

export default Footer;

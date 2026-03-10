const Footer = () => {
  return (
    <footer className="border-t border-apple-mist bg-white py-8 mt-8 no-print">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-apple-steel">
          © {new Date().getFullYear()} PayCalc — Automated Payroll System
        </p>
        <p className="text-xs text-apple-steel">
          All data is processed locally · No server uploads · Private by design
        </p>
      </div>
    </footer>
  );
};

export default Footer;

import schoolLogo from '@/assets/school-logo.png';

export function Footer() {
  return (
    <footer className="border-t border-gray-100" style={{ background: 'rgba(255,255,255,0.8)' }}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={schoolLogo} 
              alt="CPMNHS Logo" 
              className="h-10 w-10 rounded-full object-cover shadow-sm"
            />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Congressman Pablo Malasarte National High School</h3>
              <p className="text-xs text-gray-400">Cabad, Balilihan, Bohol</p>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} CPMNHS Voting Site. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

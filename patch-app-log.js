import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "import FinanceView from './components/FinanceView';",
  "import FinanceView from './components/FinanceView';\nimport SystemLogView from './components/SystemLogView';"
);

const navSearch = `<NavItem 
            icon={<BarChart2 />}
            label="Звіти" 
            isActive={activeView === 'reports'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('reports')} 
          />`;

const navReplace = `<NavItem 
            icon={<BarChart2 />}
            label="Звіти" 
            isActive={activeView === 'reports'} 
            expanded={isSidebarOpen} 
            onClick={() => setActiveView('reports')} 
          />
          {userRole === 'admin' && (
            <NavItem 
              icon={<Activity />}
              label="Системний Журнал" 
              isActive={activeView === 'logs'} 
              expanded={isSidebarOpen} 
              onClick={() => setActiveView('logs')} 
            />
          )}`;
content = content.replace(navSearch, navReplace);

const viewSearch = `{activeView === 'users' && userRole === 'admin' && <UserManagementView currentUserEmail={user.email || ''} />}`;
const viewReplace = `{activeView === 'users' && userRole === 'admin' && <UserManagementView currentUserEmail={user.email || ''} />}
              {activeView === 'logs' && userRole === 'admin' && <SystemLogView />}`;
content = content.replace(viewSearch, viewReplace);

const titleSearch = `activeView === 'users' ? 'Керування доступом' : 'Звітність'}`;
const titleReplace = `activeView === 'users' ? 'Керування доступом' : \n               activeView === 'logs' ? 'Системний Журнал' : 'Звітність'}`;
content = content.replace(titleSearch, titleReplace);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with SystemLogView");

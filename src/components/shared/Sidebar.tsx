import { Sidebar as SharedSidebar } from '@difference-suite/shared/components/shared/Sidebar';
import { TOOLS, MAIN_MENU_EXTRAS } from '../../utils/navigation';

const Sidebar = () => {
    return (
        <SharedSidebar
            tools={TOOLS.map(({ path, label, icon }) => ({ path, label, icon }))}
            mainMenuExtras={MAIN_MENU_EXTRAS.map(({ path, label, icon }) => ({ path, label, icon }))}
            logoSrc="/deep-culture-logo.png"
            dashboardPath="/data-dashboard"
            accessLink={{
                href: '/difference-suite-large-models/',
                label: 'Large Models Suite',
                badgeText: 'G',
                openInNewTab: true
            }}
        />
    );
};

export default Sidebar;

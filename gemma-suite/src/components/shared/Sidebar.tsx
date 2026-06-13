import { Sidebar as SharedSidebar } from '@difference-suite/shared/components/shared/Sidebar';
import { TOOLS, MAIN_MENU_EXTRAS } from '../../utils/navigation';

const Sidebar = () => {
    return (
        <SharedSidebar
            tools={TOOLS.map(({ path, label, icon }) => ({ path, label, icon }))}
            mainMenuExtras={MAIN_MENU_EXTRAS.map(({ path, label, icon }) => ({ path, label, icon }))}
            logoSrc={`${import.meta.env.BASE_URL}deep-culture-logo.png`}
            hideDashboardLink
            accessLink={{
                // Sibling to /difference-suite-large-models/ in production; in
                // dev the main suite lives on a different port, so this link
                // 404s locally — that is acceptable.
                href: '/',
                label: 'Difference Suite',
                badgeText: 'D',
                openInNewTab: true,
            }}
        />
    );
};

export default Sidebar;

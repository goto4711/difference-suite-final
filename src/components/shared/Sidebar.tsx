import { Sidebar as SharedSidebar } from '@difference-suite/shared/components/shared/Sidebar';
import { TOOLS } from '../../utils/navigation';

const Sidebar = () => {
    return (
        <SharedSidebar
            tools={TOOLS.map(({ path, label, icon }) => ({ path, label, icon }))}
            logoSrc="/deep-culture-logo.png"
            accessLink={{
                href: '/difference-suite-large-models/',
                label: 'Large Models Suite',
                badgeText: 'G'
            }}
        />
    );
};

export default Sidebar;

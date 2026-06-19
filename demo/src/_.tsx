import "../../src/ui/_.css";

import { MenuTab, NavTab, TopTab, BottomTab, initTheme, initAccent } from "../../src/ui/_";
import { icon_dashboard, icon_edit, icon_grid_view, icon_list, icon_code, icon_check, icon_palette } from "../../src/ui/svgicons";

import ButtonsPage from "./pages/ButtonsPage";
import InputsPage from "./pages/InputsPage";
import LayoutPage from "./pages/LayoutPage";
import DisplayPage from "./pages/DisplayPage";
import InteractivePage from "./pages/InteractivePage";
import TabsPage from "./pages/TabsPage";
import HooksPage from "./pages/HooksPage";
import ValidatePage from "./pages/ValidatePage";
import ThemePage from "./pages/ThemePage";

// 应用启动时立即初始化主题和强调色副作用
initTheme();
initAccent();

const App = () => {
    return (
        <BottomTab>
            {[
                { icon: icon_dashboard, panel: () => <ButtonsPage /> },
                { icon: icon_edit, panel: () => <InputsPage /> },
                { icon: icon_grid_view, panel: () => <LayoutPage /> },
                { icon: icon_list, panel: () => <DisplayPage /> },
                { icon: icon_code, panel: () => <HooksPage /> },
                { icon: icon_check, panel: () => <ValidatePage /> },
                { icon: icon_palette, panel: () => <ThemePage /> },
            ]}
        </BottomTab>
    );
};

export default App;

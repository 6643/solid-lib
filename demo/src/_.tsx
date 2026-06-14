import "../../src/ui/_.css";

import { NavTab } from "../../src/ui/_";

import ButtonsPage from "./pages/ButtonsPage";
import InputsPage from "./pages/InputsPage";
import LayoutPage from "./pages/LayoutPage";
import DisplayPage from "./pages/DisplayPage";
import InteractivePage from "./pages/InteractivePage";
import TabsPage from "./pages/TabsPage";
import HooksPage from "./pages/HooksPage";
import ValidatePage from "./pages/ValidatePage";
import ThemePage from "./pages/ThemePage";

const App = () => {
    return (
        <NavTab>
            {[
                { name: "按钮", panel: () => <ButtonsPage /> },
                { name: "输入", panel: () => <InputsPage /> },
                { name: "布局", panel: () => <LayoutPage /> },
                // { name: "展示", panel: (): any => <DisplayPage /> },
                // { name: "交互", panel: () => <InteractivePage /> },
                // { name: "标签", panel: () => <TabsPage /> },
                { name: "Hooks", panel: () => <HooksPage /> },
                { name: "校验", panel: () => <ValidatePage /> },
                { name: "主题", panel: () => <ThemePage /> },
            ]}
        </NavTab>
    );
};

export default App;

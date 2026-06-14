import { createSignal } from "solid-js";
import {
    Card,
    FlexBox,
    TextInput,
    TextArea,
    PasswordInput,
    NumberInput,
    EmailInput,
    TelInput,
    RangeInput,
    CheckButton,
    RadioButton,
    IconButton,
    SvgIcon,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";
import { icon_add, icon_remove, icon_search, icon_close } from "../../../src/ui/svgicons";

const InputsPage = () => {
    const [name, setName] = createSignal("张三");
    const [email, setEmail] = createSignal("");
    const [phone, setPhone] = createSignal("");
    const [age, setAge] = createSignal("25");
    const [bio, setBio] = createSignal("这是一段简介文本...");
    const [volume, setVolume] = createSignal(50);
    const [search, setSearch] = createSignal("");
    const [qty, setQty] = createSignal("1");
    const [agree, setAgree] = createSignal(false);
    const [gender, setGender] = createSignal("male");

    const validateEmail = (value: string) => {
        if (!value) return "邮箱不能为空";
        if (!value.includes("@")) return "请输入有效的邮箱地址";
        return undefined;
    };

    // 远程校验示例（模拟）
    const checkEmailRemote = async (value: string) => {
        if (!value || !value.includes("@")) return undefined;
        await new Promise((r) => setTimeout(r, 800));
        return value === "taken@example.com" ? "该邮箱已被注册" : undefined;
    };

    return (
        <div class={styles.page}>
            <h1 class={styles.title}>输入组件</h1>
            <p class={styles.desc}>TextInput、PasswordInput、NumberInput、EmailInput、TelInput、RangeInput</p>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>TextInput 单行</h2>
                    <FlexBox gap={16} dir="column">
                        <TextInput label="姓名" value={name()} changed={setName} />
                        <TextInput label="只读" value="不可编辑" />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>TextInput 多行</h2>
                    <FlexBox gap={16} dir="column">
                        <TextArea label="简介" row={4} value={bio()} changed={setBio} minLen={10} maxLen={200} />
                        <TextInput
                            label="备注"
                            changed={(v) => console.log("备注:", v)}
                            validate={(v) => (v.length < 5 ? "至少输入5个字符" : undefined)}
                        />
                    </FlexBox>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>PasswordInput</h2>
                    <FlexBox gap={16} dir="column">
                        <PasswordInput label="密码" minLen={6} maxLen={20} changed={(v) => console.log("密码:", v)} />
                        <PasswordInput label="确认密码" validate={(v) => (v.length < 6 ? "至少6位" : undefined)} />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>EmailInput</h2>
                    <FlexBox gap={16} dir="column">
                        <EmailInput label="邮箱" value={email()} changed={setEmail} validate={checkEmailRemote} />
                        <EmailInput label="备用邮箱" />
                    </FlexBox>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>NumberInput</h2>
                    <FlexBox gap={16} dir="column">
                        <NumberInput
                            label="年龄"
                            value={age()}
                            changed={setAge}
                            min={0}
                            max={150}
                            step={1}
                            right={() => <IconButton icon={icon_add} />}
                        />
                        <NumberInput label="数量" min={0} max={999} step={10} />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>TelInput</h2>
                    <FlexBox gap={16} dir="column">
                        <TelInput label="手机号" value={phone()} changed={setPhone} />
                        <TelInput label="固定电话" />
                    </FlexBox>
                </Card>
            </FlexBox>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>RangeInput</h2>
                <FlexBox gap={16} dir="column">
                    <RangeInput label="音量" value={volume()} changed={setVolume} min={0} max={100} unit="%" />
                    <RangeInput label="步长为5" value={50} changed={() => {}} min={0} max={100} step={5} />
                    <RangeInput label="只读滑块" value={75} min={0} max={100} />
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>内联图标按钮</h2>
                <FlexBox gap={16} dir="column">
                    <TextInput
                        label="搜索"
                        value={search()}
                        changed={setSearch}
                        left={() => <SvgIcon name={icon_search} size={20} />}
                        right={() => <SvgIcon name={icon_close} size={20} />}
                    />
                    <NumberInput
                        label="数量"
                        min={0}
                        max={99}
                        value={qty()}
                        changed={setQty}
                        left={() => <IconButton icon={icon_remove} />}
                        right={() => <SvgIcon name={icon_add} size={20} />}
                    />
                    <TextInput label="仅左侧图标" left={() => <IconButton icon={icon_search} />} />
                    <TextInput label="仅右侧图标" right={() => <IconButton icon={icon_close} />} />
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>CheckButton & RadioButton</h2>
                <FlexBox gap={16} dir="column">
                    <CheckButton label="同意用户协议" checked={agree()} changed={setAgree} />
                    <CheckButton label="禁用选项" disabled />
                    <FlexBox gap={16}>
                        <RadioButton label="男" value="male" name="gender" checked={gender() === "male"} changed={setGender} />
                        <RadioButton label="女" value="female" name="gender" checked={gender() === "female"} changed={setGender} />
                        <RadioButton label="其他" value="other" name="gender" checked={gender() === "other"} changed={setGender} />
                    </FlexBox>
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>当前值</h2>
                <div class={styles.codeBlock}>
                    <pre>
                        {JSON.stringify(
                            { name: name(), email: email(), phone: phone(), age: age(), bio: bio(), volume: volume(), agree: agree(), gender: gender() },
                            null,
                            2,
                        )}
                    </pre>
                </div>
            </Card>
        </div>
    );
};

export default InputsPage;

import { createSignal } from "solid-js";
import {
  Card,
  FlexBox,
  TextInput,
  EmailInput,
  PasswordInput,
  TelInput,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const ValidatePage = () => {
  const [username, setUsername] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm] = createSignal("");
  const [phone, setPhone] = createSignal("");

  // 本地同步校验
  const validateUsername = (v: string) => {
    if (!v) return "用户名不能为空";
    if (v.length < 3) return "至少3个字符";
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return "仅允许字母、数字、下划线";
    return undefined;
  };

  // 远程异步校验（模拟）
  const checkUsernameRemote = async (v: string) => {
    if (!v || v.length < 3) return undefined;
    await new Promise(r => setTimeout(r, 600));
    return ["admin", "root", "test"].includes(v) ? "该用户名已被占用" : undefined;
  };

  const checkEmailRemote = async (v: string) => {
    if (!v || !v.includes("@")) return undefined;
    await new Promise(r => setTimeout(r, 800));
    return v === "taken@example.com" ? "该邮箱已被注册" : undefined;
  };

  // 密码确认校验
  const validateConfirm = (v: string) => {
    if (!v) return "请确认密码";
    if (v !== password()) return "两次密码不一致";
    return undefined;
  };

  return (
    <div class={styles.page}>
      <h1 class={styles.title}>校验演示</h1>
      <p class={styles.desc}>本地同步校验 + 远程异步校验</p>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>本地校验</h2>
          <FlexBox gap={16} dir="column">
            <TextInput
              label="用户名"
              value={username()}
              changed={setUsername}
              validate={validateUsername}
            />
            <PasswordInput
              label="密码"
              value={password()}
              changed={setPassword}
              minLen={6}
              validate={(v) => v && v.length < 6 ? "至少6位" : undefined}
            />
            <PasswordInput
              label="确认密码"
              value={confirm()}
              changed={setConfirm}
              validate={validateConfirm}
            />
          </FlexBox>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>远程校验</h2>
          <FlexBox gap={16} dir="column">
            <TextInput
              label="用户名（远程查重）"
              value={username()}
              changed={setUsername}
              validate={checkUsernameRemote}
            />
            <EmailInput
              label="邮箱（远程查重）"
              value={email()}
              changed={setEmail}
              validate={checkEmailRemote}
            />
            <TelInput
              label="手机号"
              value={phone()}
              changed={setPhone}
              validate={(v) => v && !/^1[3-9]\d{9}$/.test(v) ? "手机号格式不正确" : undefined}
            />
          </FlexBox>
        </Card>
      </FlexBox>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>当前值</h2>
        <div class={styles.codeBlock}>
          <pre>{JSON.stringify({
            username: username(),
            email: email(),
            password: password() ? "***" : "",
            confirm: confirm() ? "***" : "",
            phone: phone(),
          }, null, 2)}</pre>
        </div>
      </Card>
    </div>
  );
};

export default ValidatePage;

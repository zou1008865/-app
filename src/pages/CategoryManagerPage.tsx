import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { addCategory as addCategoryRequest, deleteCategory as deleteCategoryRequest, getState, renameCategory as renameCategoryRequest } from '../api';
import {
  cleanCategoryName,
  getCategories,
  isPresetCategory,
  loadCustomCategories,
} from '../categoryStorage';
import type { Transaction, TransactionType } from '../types';

function getTypeLabel(type: TransactionType) {
  return type === 'expense' ? '支出' : '收入';
}

export default function CategoryManagerPage() {
  const [type, setType] = useState<TransactionType>('expense');
  const [customCategories, setCustomCategories] = useState(() => loadCustomCategories());
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [replacementName, setReplacementName] = useState('');
  const [message, setMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  useEffect(() => { getState().then((state) => { setTransactions(state.transactions); setCustomCategories(state.customCategories); }).catch((error: Error) => setMessage(error.message)); }, []);
  const allCategories = getCategories(type, customCategories);
  const customForType = customCategories[type];

  function validateName(value: string, ignoredName?: string) {
    const name = cleanCategoryName(value);
    if (!name) return '请输入分类名称。';
    if (allCategories.some((category) => category === name && category !== ignoredName)) {
      return '这个分类已经存在，请换一个名称。';
    }
    return '';
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateName(newName);
    if (error) return setMessage(error);
    const name = cleanCategoryName(newName);
    try { await addCategoryRequest(type, name); setCustomCategories((current) => ({ ...current, [type]: [...current[type], name] })); setNewName(''); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : '分类保存失败。'); }
  }

  async function renameCategory(name: string) {
    const error = validateName(editedName, name);
    if (error) return setMessage(error);
    const replacement = cleanCategoryName(editedName);
    try { await renameCategoryRequest(type, name, replacement); setTransactions((current) => current.map((item) => item.type === type && item.category === name ? { ...item, category: replacement } : item)); setCustomCategories((current) => ({ ...current, [type]: current[type].map((category) => category === name ? replacement : category) })); setEditingName(null); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : '分类修改失败。'); }
  }

  function beginDelete(name: string) {
    const alternatives = allCategories.filter((category) => category !== name);
    setDeletingName(name);
    setReplacementName(alternatives[0] || '');
    setMessage('');
  }

  async function deleteCategory() {
    if (!deletingName || !replacementName) return;
    try { await deleteCategoryRequest(type, deletingName, replacementName); setTransactions((current) => current.map((item) => item.type === type && item.category === deletingName ? { ...item, category: replacementName } : item)); setCustomCategories((current) => ({ ...current, [type]: current[type].filter((category) => category !== deletingName) })); setDeletingName(null); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : '分类删除失败。'); }
  }

  return (
    <main className="app-shell category-manager-page">
      <header className="page-header">
        <div>
          <div className="title-row"><h1>分类管理</h1></div>
          <p>预置分类由系统维护；你创建的分类可以新增、改名或删除。</p>
        </div>
      </header>

      {message && <p className="storage-message">{message}</p>}

      <section className="category-manager-panel">
        <fieldset className="type-toggle">
          <legend>管理类型</legend>
          {(['expense', 'income'] as const).map((item) => (
            <label className={type === item ? 'active' : ''} key={item}>
              <input type="radio" checked={type === item} onChange={() => { setType(item); setEditingName(null); setDeletingName(null); setMessage(''); }} />
              {getTypeLabel(item)}分类
            </label>
          ))}
        </fieldset>

        <form className="category-add-form" onSubmit={addCategory}>
          <label><span>新增{getTypeLabel(type)}分类</span><input value={newName} maxLength={20} placeholder="例如：房租" onChange={(event) => setNewName(event.target.value)} /></label>
          <button type="submit">添加分类</button>
        </form>

        <div className="category-management-list">
          {allCategories.map((name) => {
            const preset = isPresetCategory(type, name);
            const recordCount = transactions.filter((item) => item.type === type && item.category === name).length;
            return (
              <article className="managed-category-row" key={name}>
                <div><strong>{name}</strong><span>{preset ? '预置分类，不可修改' : `自定义分类 · ${recordCount} 笔记录`}</span></div>
                {preset ? <em>预置</em> : editingName === name ? (
                  <div className="category-edit-actions"><input aria-label={`修改 ${name} 的名称`} value={editedName} maxLength={20} onChange={(event) => setEditedName(event.target.value)} /><button type="button" onClick={() => renameCategory(name)}>保存</button><button type="button" className="minor-action" onClick={() => setEditingName(null)}>取消</button></div>
                ) : <div className="category-actions"><button type="button" className="minor-action" onClick={() => { setEditingName(name); setEditedName(name); setDeletingName(null); }}>改名</button><button type="button" className="danger-action" onClick={() => beginDelete(name)}>删除</button></div>}
              </article>
            );
          })}
        </div>
      </section>

      {deletingName && (
        <section className="delete-category-panel" aria-label="删除分类确认">
          <h2>删除“{deletingName}”</h2>
          <p>该分类的历史账目会保留，并统一转到你选择的新分类。</p>
          <label><span>迁移到</span><select value={replacementName} onChange={(event) => setReplacementName(event.target.value)}>{allCategories.filter((name) => name !== deletingName).map((name) => <option key={name}>{name}</option>)}</select></label>
          <div className="category-actions"><button type="button" className="danger-action" onClick={deleteCategory}>确认迁移并删除</button><button type="button" className="minor-action" onClick={() => setDeletingName(null)}>取消</button></div>
        </section>
      )}
    </main>
  );
}

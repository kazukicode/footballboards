import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Arrow, Line, Group } from 'react-konva';
import Konva from 'konva';

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  name: string;
  color: string;
  team: 'home' | 'away';
  isSelected: boolean;
}

const createArcPoints = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number, segments = 12): number[] => {
  const points: number[] = [];
  let normalizedEnd = endAngle;
  if (normalizedEnd <= startAngle) {
    normalizedEnd += 360;
  }
  const step = (normalizedEnd - startAngle) / segments;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (startAngle + step * i) * (Math.PI / 180);
    points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  return points;
};

interface ArrowData {
  id: string;
  points: number[];
}

interface TextData {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontStyle: 'normal' | 'bold';
}

interface BallData {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface SelectedItem {
  type: 'player' | 'arrow' | 'text' | 'ball';
  id: string;
}

interface SelectionBox {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
}

interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  data: { players: Player[]; arrows: ArrowData[]; texts: TextData[]; balls: BallData[]; pitchColor?: string; lineColor?: string; playerNumberColor?: string; playerNameColor?: string };
}

const App: React.FC = () => {
  const defaultPitchColor = '#ffffff';
  const defaultLineColor = '#000000';
  const defaultBallColor = '#000000';
  const defaultPlayerNumberColor = '#ffffff';
  const defaultPlayerNameColor = '#000000';
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [arrows, setArrows] = useState<ArrowData[]>([]);
  const [texts, setTexts] = useState<TextData[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [tool, setTool] = useState<'playerHome' | 'playerAway' | 'arrow' | 'text' | 'ball' | 'select'>('select');
  const [homeColor, setHomeColor] = useState('#1976d2');
  const [awayColor, setAwayColor] = useState('#d32f2f');
  const [ballColor, setBallColor] = useState(defaultBallColor);
  const [pitchColor, setPitchColor] = useState(defaultPitchColor);
  const [lineColor, setLineColor] = useState(defaultLineColor);
  const [playerNumberColor, setPlayerNumberColor] = useState(defaultPlayerNumberColor);
  const [playerNameColor, setPlayerNameColor] = useState(defaultPlayerNameColor);
  const [drawingArrow, setDrawingArrow] = useState<{ start: { x: number; y: number } | null }>({ start: null });
  const [balls, setBalls] = useState<BallData[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [dragGroupPositions, setDragGroupPositions] = useState<Record<string, any> | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [textFontSize, setTextFontSize] = useState(16);
  const [textBold, setTextBold] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  const [suppressNextStageClick, setSuppressNextStageClick] = useState(false);
  const [mode, setMode] = useState<'select' | 'edit'>('select');
  const [sidebarTab, setSidebarTab] = useState<'tools' | 'text' | 'colors' | 'file'>('tools');
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pitchWidth = 800;
  const pitchHeight = 500;
  const benchHeight = 120;
  const stageWidth = pitchWidth;
  const benchWidth = pitchWidth;
  const editorPanelWidth = stageWidth;
  const stageHeight = pitchHeight + benchHeight;

  useEffect(() => {
    if (currentProject) {
      setPlayers(currentProject.data.players.map(player => ({
        ...player,
        name: player.name || `選手${player.number}`,
        color: player.color ?? '#1976d2',
        team: player.team ?? 'home',
        isSelected: false,
      })));
      setArrows(currentProject.data.arrows);
      setTexts(currentProject.data.texts.map(text => ({
        ...text,
        color: text.color ?? '#000000',
        fontSize: text.fontSize ?? 16,
        fontStyle: text.fontStyle ?? 'normal',
      })));
      setBalls(currentProject.data.balls?.map(ball => ({
        ...ball,
        color: ball.color || defaultBallColor,
      })) ?? []);
      setPitchColor(currentProject.data.pitchColor ?? defaultPitchColor);
      setLineColor(currentProject.data.lineColor ?? defaultLineColor);
      setPlayerNumberColor(currentProject.data.playerNumberColor ?? defaultPlayerNumberColor);
      setPlayerNameColor(currentProject.data.playerNameColor ?? defaultPlayerNameColor);
      setSelectedItems([]);
    }
  }, [currentProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (selectedItems.length === 0) return;
      deleteSelectedItems();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems]);

  useEffect(() => {
    const selectedTextIds = selectedItems.filter(item => item.type === 'text').map(item => item.id);
    if (selectedTextIds.length !== 1) return;
    const selectedText = texts.find(text => text.id === selectedTextIds[0]);
    if (!selectedText) return;
    setTextColor(selectedText.color ?? '#000000');
    setTextFontSize(selectedText.fontSize ?? 16);
    setTextBold((selectedText.fontStyle ?? 'normal') === 'bold');
  }, [selectedItems, texts]);

  useEffect(() => {
    const selectedPlayerIds = new Set(
      selectedItems
        .filter(item => item.type === 'player')
        .map(item => item.id)
    );

    setPlayers(prev => prev.map(player => {
      const isSelected = selectedPlayerIds.has(player.id);
      return player.isSelected === isSelected ? player : { ...player, isSelected };
    }));
  }, [selectedItems]);

  const resetEditorState = () => {
    setPlayers([]);
    setArrows([]);
    setTexts([]);
    setBalls([]);
    setPitchColor(defaultPitchColor);
    setLineColor(defaultLineColor);
    setPlayerNumberColor(defaultPlayerNumberColor);
    setPlayerNameColor(defaultPlayerNameColor);
    setSelectedItems([]);
    setDragGroupPositions(null);
    setDrawingArrow({ start: null });
    setSelectionBox({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  };

  const createNewProject = () => {
    const title = prompt('新しいプロジェクトのタイトルを入力してください:');
    if (!title) return;
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title,
      createdAt: now,
      updatedAt: now,
      data: { players: [], arrows: [], texts: [], balls: [] },
    };
    resetEditorState();
    setCurrentProject(newProject);
    setProjectTitle(title);
    setMode('edit');
  };

  const openProject = (project: Project) => {
    resetEditorState();
    setCurrentProject(project);
    setProjectTitle(project.title);
    setMode('edit');
  };

  const buildProjectSnapshot = (): Project | null => {
    if (!currentProject) return null;
    const title = projectTitle.trim();
    if (!title) {
      alert('タイトルを入力してください。');
      return null;
    }
    return {
      ...currentProject,
      title,
      updatedAt: new Date().toISOString(),
      data: { players, arrows, texts, balls, pitchColor, lineColor, playerNumberColor, playerNameColor },
    };
  };

  const exportCurrentProject = () => {
    const projectToExport = buildProjectSnapshot();
    if (!projectToExport) {
      alert('新規作成または JSON 読み込み後に保存してください。');
      return;
    }
    setCurrentProject(projectToExport);
    const dataStr = JSON.stringify(projectToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectToExport.title || 'project'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('JSONファイルを保存しました。');
  };

  const isValidProject = (obj: any): obj is Project => {
    return obj && typeof obj.id === 'string' && typeof obj.title === 'string' && typeof obj.createdAt === 'string' && typeof obj.updatedAt === 'string' && obj.data && Array.isArray(obj.data.players) && Array.isArray(obj.data.arrows) && Array.isArray(obj.data.texts) && Array.isArray(obj.data.balls);
  };

  const importProjectData = (data: any) => {
    const importedProject = Array.isArray(data)
      ? data.find(item => isValidProject(item)) ?? null
      : isValidProject(data)
        ? data
        : null;

    if (!importedProject) {
      alert('インポートできるプロジェクトデータが見つかりませんでした。');
      return;
    }

    openProject(importedProject);
    alert('JSONファイルを読み込みました。');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result as string);
        importProjectData(imported);
      } catch (error) {
        alert('ファイルの読み込みに失敗しました。JSON形式を確認してください。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSelectionKey = (type: SelectedItem['type'], id: string) => `${type}-${id}`;

  const isSelectedItem = (type: SelectedItem['type'], id: string) => {
    return selectedItems.some(item => item.type === type && item.id === id);
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setDragGroupPositions(null);
  };

  const handleSelectItem = (e: Konva.KonvaEventObject<MouseEvent>, type: SelectedItem['type'], id: string) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;

    const isSelected = isSelectedItem(type, id);
    const multi = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    if (multi) {
      if (isSelected) {
        setSelectedItems(prev => prev.filter(item => !(item.type === type && item.id === id)));
      } else {
        setSelectedItems(prev => [...prev, { type, id }]);
      }
    } else {
      setSelectedItems([{ type, id }]);
    }
  };

  const deleteSelectedItems = () => {
    const selectedKeys = new Set(selectedItems.map(item => getSelectionKey(item.type, item.id)));
    setPlayers(prev => prev.filter(player => !selectedKeys.has(getSelectionKey('player', player.id))));
    setTexts(prev => prev.filter(text => !selectedKeys.has(getSelectionKey('text', text.id))));
    setArrows(prev => prev.filter(arrow => !selectedKeys.has(getSelectionKey('arrow', arrow.id))));
    setBalls(prev => prev.filter(ball => !selectedKeys.has(getSelectionKey('ball', ball.id))));
    setSelectedItems([]);
    setDragGroupPositions(null);
  };

  const updateSelectedTextsStyle = (updates: Partial<Pick<TextData, 'color' | 'fontSize' | 'fontStyle'>>) => {
    const selectedTextIds = new Set(
      selectedItems
        .filter(item => item.type === 'text')
        .map(item => item.id)
    );
    if (selectedTextIds.size === 0) return;

    setTexts(prev => prev.map(text => (
      selectedTextIds.has(text.id) ? { ...text, ...updates } : text
    )));
  };

  const prepareDragGroup = (currentType: SelectedItem['type'], currentId: string, stageX: number, stageY: number) => {
    const selected = isSelectedItem(currentType, currentId) ? selectedItems : [{ type: currentType, id: currentId }];
    setSelectedItems(selected);
    const positions: Record<string, any> = {};

    selected.forEach(item => {
      if (item.type === 'player') {
        const player = players.find(p => p.id === item.id);
        if (player) {
          positions[getSelectionKey(item.type, item.id)] = { x: player.x, y: player.y };
        }
      }
      if (item.type === 'text') {
        const text = texts.find(t => t.id === item.id);
        if (text) {
          positions[getSelectionKey(item.type, item.id)] = { x: text.x, y: text.y };
        }
      }
      if (item.type === 'arrow') {
        const arrow = arrows.find(a => a.id === item.id);
        if (arrow) {
          positions[getSelectionKey(item.type, item.id)] = {
            points: [...arrow.points],
            x: stageX,
            y: stageY,
          };
        }
      }
      if (item.type === 'ball') {
        const ball = balls.find(b => b.id === item.id);
        if (ball) {
          positions[getSelectionKey(item.type, item.id)] = { x: ball.x, y: ball.y };
        }
      }
    });

    setDragGroupPositions(positions);
  };

  const handleGroupDragMove = (e: Konva.KonvaEventObject<DragEvent>, type: SelectedItem['type'], id: string) => {
    if (!dragGroupPositions) return;
    const dragKey = getSelectionKey(type, id);
    const start = dragGroupPositions[dragKey];
    if (!start) return;

    const dx = e.target.x() - start.x;
    const dy = e.target.y() - start.y;
    const selectedKeys = new Set(selectedItems.map(item => getSelectionKey(item.type, item.id)));

    setPlayers(prev => prev.map(player => {
      if (!selectedKeys.has(getSelectionKey('player', player.id))) return player;
      const origin = dragGroupPositions[getSelectionKey('player', player.id)];
      return origin ? { ...player, x: origin.x + dx, y: origin.y + dy } : player;
    }));

    setTexts(prev => prev.map(text => {
      if (!selectedKeys.has(getSelectionKey('text', text.id))) return text;
      const origin = dragGroupPositions[getSelectionKey('text', text.id)];
      return origin ? { ...text, x: origin.x + dx, y: origin.y + dy } : text;
    }));

    setArrows(prev => prev.map(arrow => {
      if (!selectedKeys.has(getSelectionKey('arrow', arrow.id))) return arrow;
      const origin = dragGroupPositions[getSelectionKey('arrow', arrow.id)];
      if (!origin) return arrow;
      return {
        ...arrow,
        points: origin.points.map((value: number, index: number) => value + (index % 2 === 0 ? dx : dy)),
      };
    }));

    setBalls(prev => prev.map(ball => {
      if (!selectedKeys.has(getSelectionKey('ball', ball.id))) return ball;
      const origin = dragGroupPositions[getSelectionKey('ball', ball.id)];
      return origin ? { ...ball, x: origin.x + dx, y: origin.y + dy } : ball;
    }));

    if (type === 'arrow') {
      e.target.position({ x: 0, y: 0 });
    }
  };

  const handleGroupDragEnd = () => {
    setDragGroupPositions(null);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (suppressNextStageClick) {
      setSuppressNextStageClick(false);
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === 'select' && e.target === stage) {
      clearSelection();
      return;
    }

    if (tool === 'playerHome' || tool === 'playerAway') {
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        number: players.length + 1,
        name: `選手${players.length + 1}`,
        color: tool === 'playerHome' ? homeColor : awayColor,
        team: tool === 'playerHome' ? 'home' : 'away',
        isSelected: false,
      };
      setPlayers([...players, newPlayer]);
    } else if (tool === 'ball') {
      const newBall: BallData = {
        id: `ball-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        color: ballColor,
      };
      setBalls([...balls, newBall]);
    } else if (tool === 'text') {
      const textToAdd = textInputValue.trim() || 'テキスト';
      const newText: TextData = {
        id: `text-${Date.now()}`,
        x: pos.x,
        y: pos.y,
        text: textToAdd,
        color: textColor,
        fontSize: textFontSize,
        fontStyle: textBold ? 'bold' : 'normal',
      };
      setTexts([...texts, newText]);
    } else if (tool === 'arrow' && !drawingArrow.start) {
      setDrawingArrow({ start: pos });
    } else if (tool === 'arrow' && drawingArrow.start) {
      const newArrow: ArrowData = {
        id: `arrow-${Date.now()}`,
        points: [drawingArrow.start.x, drawingArrow.start.y, pos.x, pos.y],
      };
      setArrows([...arrows, newArrow]);
      setDrawingArrow({ start: null });
    }
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'select') return;
    if (e.evt.button !== 0) return;
    if (e.target.draggable()) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    setSelectionBox({
      visible: true,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      startX: pos.x,
      startY: pos.y,
    });
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionBox.visible) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const x = Math.min(selectionBox.startX, pos.x);
    const y = Math.min(selectionBox.startY, pos.y);
    const width = Math.abs(pos.x - selectionBox.startX);
    const height = Math.abs(pos.y - selectionBox.startY);

    setSelectionBox(prev => ({ ...prev, x, y, width, height }));
  };

  const handleStageMouseUp = () => {
    if (!selectionBox.visible) return;

    const hasDragged = selectionBox.width > 3 || selectionBox.height > 3;
    if (hasDragged) {
      const minX = selectionBox.x;
      const maxX = selectionBox.x + selectionBox.width;
      const minY = selectionBox.y;
      const maxY = selectionBox.y + selectionBox.height;

      const selectedPlayers: SelectedItem[] = players
        .filter(player => player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY)
        .map(player => ({ type: 'player', id: player.id }));

      const selectedBalls: SelectedItem[] = balls
        .filter(ball => ball.x >= minX && ball.x <= maxX && ball.y >= minY && ball.y <= maxY)
        .map(ball => ({ type: 'ball', id: ball.id }));

      setSelectedItems([...selectedPlayers, ...selectedBalls]);
      setDragGroupPositions(null);
      setSuppressNextStageClick(true);
    }

    setSelectionBox({ visible: false, x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });
  };

  const handlePlayerDragEnd = (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!dragGroupPositions) {
      const newX = e.target.x();
      const newY = e.target.y();
      setPlayers(players.map(p => p.id === id ? { ...p, x: newX, y: newY } : p));
    }
    handleGroupDragEnd();
  };

  const handleTextDragEnd = (_id: string) => {
    handleGroupDragEnd();
  };

  const handleArrowDragEnd = (_id: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (dragGroupPositions) {
      e.target.position({ x: 0, y: 0 });
    }
    handleGroupDragEnd();
  };

  const handleTextChange = (id: string, newText: string) => {
    setTexts(texts.map(t => t.id === id ? { ...t, text: newText } : t));
  };

  const handlePlayerNameChange = (id: string) => {
    const player = players.find(p => p.id === id);
    if (!player) return;
    const newName = prompt('選手名を入力してください:', player.name);
    if (newName === null) return;
    setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const selectedPlayerIds = selectedItems
    .filter(item => item.type === 'player')
    .map(item => item.id);
  const selectedSinglePlayer = selectedPlayerIds.length === 1
    ? players.find(player => player.id === selectedPlayerIds[0]) ?? null
    : null;

  const updateSelectedPlayerNumber = (value: string) => {
    if (!selectedSinglePlayer) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const nextNumber = Math.max(1, Math.min(99, Math.floor(parsed)));
    setPlayers(prev => prev.map(player => (
      player.id === selectedSinglePlayer.id ? { ...player, number: nextNumber } : player
    )));
  };

  const updateSelectedPlayerName = (value: string) => {
    if (!selectedSinglePlayer) return;
    setPlayers(prev => prev.map(player => (
      player.id === selectedSinglePlayer.id ? { ...player, name: value } : player
    )));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '0 36px', boxSizing: 'border-box' }}>
      {mode === 'select' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px 20px 64px', background: '#ffffff', color: '#111111', boxSizing: 'border-box' }}>
          <h1 style={{ marginBottom: '56px', fontSize: '48px', letterSpacing: '0.16em', fontWeight: 800, color: '#111111' }}>FOOTBALL BOARDS</h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={createNewProject} style={{ margin: '10px', padding: '16px 34px', background: '#111111', color: '#ffffff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>新規作成</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ margin: '10px', padding: '16px 34px', background: '#ffffff', color: '#111111', border: '1px solid #cccccc', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>JSONを開く</button>
          </div>
          <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImportFile} style={{ display: 'none' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: '100vh', background: '#f3f5f8', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: 260, flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '10px', margin: '0' }}>
          <aside style={{ width: 260, background: '#141414', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100%' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9fa2ae', letterSpacing: '0.12em' }}>PROJECT</div>
              <div style={{ marginTop: '10px', fontSize: '20px', fontWeight: 700 }}>{projectTitle || '無題のプロジェクト'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => setSidebarTab('tools')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'tools' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>操作</button>
              <button onClick={() => setSidebarTab('text')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'text' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>文字</button>
              <button onClick={() => setSidebarTab('colors')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'colors' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>色</button>
              <button onClick={() => setSidebarTab('file')} style={{ width: '100%', padding: '8px', border: 'none', borderRadius: '8px', background: sidebarTab === 'file' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer' }}>ファイル</button>
            </div>

            {sidebarTab === 'tools' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <button onClick={() => setTool('select')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'select' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>選択</button>
                <button onClick={() => setTool('playerHome')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'playerHome' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>ホーム選手追加</button>
                <button onClick={() => setTool('playerAway')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'playerAway' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>アウェイ選手追加</button>
                <button onClick={() => setTool('ball')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'ball' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>ボール追加</button>
                <button onClick={() => setTool('arrow')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'arrow' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>矢印追加</button>
                <button onClick={() => setTool('text')} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: tool === 'text' ? '#4a4a4a' : '#1f1f1f', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>文字追加</button>
                {selectedSinglePlayer && (
                  <div style={{ display: 'grid', gap: '6px', marginTop: '8px', padding: '10px', borderRadius: '10px', background: '#1f1f1f', border: '1px solid #333333' }}>
                    <div style={{ fontSize: '12px', color: '#d1d5db' }}>選択中の選手を編集</div>
                    <label htmlFor="player-number-input" style={{ color: '#d1d5db', fontSize: '12px' }}>背番号</label>
                    <input
                      id="player-number-input"
                      type="number"
                      min={1}
                      max={99}
                      value={selectedSinglePlayer.number}
                      onChange={(e) => updateSelectedPlayerNumber(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#141414', color: '#ffffff' }}
                    />
                    <label htmlFor="player-name-input" style={{ color: '#d1d5db', fontSize: '12px' }}>選手名</label>
                    <input
                      id="player-name-input"
                      type="text"
                      value={selectedSinglePlayer.name}
                      onChange={(e) => updateSelectedPlayerName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#141414', color: '#ffffff' }}
                    />
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'text' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-input-box" style={{ color: '#d1d5db', fontSize: '12px' }}>追加テキスト</label>
                  <input
                    id="text-input-box"
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onFocus={() => setTool('text')}
                    placeholder="入力後、ピッチをクリック"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#1f1f1f', color: '#ffffff' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-font-size" style={{ color: '#d1d5db', fontSize: '12px' }}>文字サイズ</label>
                  <input
                    id="text-font-size"
                    type="number"
                    min={8}
                    max={72}
                    value={textFontSize}
                    onChange={(e) => {
                      const nextSize = Math.max(8, Math.min(72, Number(e.target.value) || 16));
                      setTextFontSize(nextSize);
                      updateSelectedTextsStyle({ fontSize: nextSize });
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #3a3a3a', background: '#1f1f1f', color: '#ffffff' }}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label htmlFor="text-color" style={{ color: '#d1d5db', fontSize: '12px' }}>文字色</label>
                  <input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      const color = e.target.value;
                      setTextColor(color);
                      updateSelectedTextsStyle({ color });
                    }}
                    style={{ width: '100%', height: '42px', border: 'none', borderRadius: '8px', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <button
                  onClick={() => {
                    const nextBold = !textBold;
                    setTextBold(nextBold);
                    updateSelectedTextsStyle({ fontStyle: nextBold ? 'bold' : 'normal' });
                  }}
                  style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: textBold ? '#616161' : '#2a2a2a', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                >
                  太字: {textBold ? 'ON' : 'OFF'}
                </button>
              </div>
            )}

            {sidebarTab === 'colors' && (
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>ホーム色</span>
                  <input type="color" value={homeColor} onChange={(e) => {
                    const color = e.target.value;
                    setHomeColor(color);
                    setPlayers(prev => prev.map(player => player.team === 'home' ? { ...player, color } : player));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>アウェイ色</span>
                  <input type="color" value={awayColor} onChange={(e) => {
                    const color = e.target.value;
                    setAwayColor(color);
                    setPlayers(prev => prev.map(player => player.team === 'away' ? { ...player, color } : player));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>ボール色</span>
                  <input type="color" value={ballColor} onChange={(e) => {
                    const color = e.target.value;
                    setBallColor(color);
                    setBalls(prev => prev.map(ball => ({ ...ball, color })));
                  }} style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>コート色</span>
                  <input
                    type="color"
                    value={pitchColor}
                    onChange={(e) => setPitchColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>線色</span>
                  <input
                    type="color"
                    value={lineColor}
                    onChange={(e) => setLineColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>背番号色</span>
                  <input
                    type="color"
                    value={playerNumberColor}
                    onChange={(e) => setPlayerNumberColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>選手名色</span>
                  <input
                    type="color"
                    value={playerNameColor}
                    onChange={(e) => setPlayerNameColor(e.target.value)}
                    style={{ width: '42px', height: '42px', border: 'none', padding: 0, cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {sidebarTab === 'file' && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <button onClick={exportCurrentProject} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#0077ff', color: '#fff', cursor: 'pointer' }}>JSON保存</button>
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#5c6bc0', color: '#fff', cursor: 'pointer' }}>JSON読込</button>
                <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImportFile} style={{ display: 'none' }} />
                <button onClick={() => { setPlayers([]); setArrows([]); setTexts([]); setBalls([]); setSelectedItems([]); }} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: '#d32f2f', color: '#fff', cursor: 'pointer' }}>クリア</button>
                <button onClick={deleteSelectedItems} disabled={selectedItems.length === 0} style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '10px', background: selectedItems.length > 0 ? '#ff8f00' : '#9e9e9e', color: '#fff', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed' }}>
                  選択項目を削除
                </button>
              </div>
            )}
            <div style={{ marginTop: 'auto', fontSize: '12px', color: '#7a7a7a' }}>JSON保存でファイルを書き出し、JSON読込で再編集できます。</div>
          </aside>
          <button onClick={() => { setMode('select'); setCurrentProject(null); resetEditorState(); }} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f5f5f5', border: '1px solid #d9d9d9', color: '#111111', cursor: 'pointer' }}>ホームへ戻る</button>
          </div>
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '8px 24px 24px 50px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ width: '100%', maxWidth: editorPanelWidth }}>
                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#333' }}>現在の編集モード</div>
                    <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 700 }}>
                      {tool === 'select' ? '選択' : tool === 'playerHome' ? 'ホーム選手追加' : tool === 'playerAway' ? 'アウェイ選手追加' : tool === 'ball' ? 'ボール追加' : tool === 'arrow' ? '矢印追加' : '文字追加'}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>作成日時: {currentProject ? new Date(currentProject.createdAt).toLocaleString() : '-'}</div>
                </div>
                <Stage
                  width={stageWidth}
                  height={stageHeight}
                  ref={stageRef}
                  onClick={handleStageClick}
                  onMouseDown={handleStageMouseDown}
                  onMouseMove={handleStageMouseMove}
                  onMouseUp={handleStageMouseUp}
                  style={{ border: '1px solid #cfd8dc', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', background: '#f3f5f8' }}
                >
                  <Layer>
                    <Rect x={0} y={pitchHeight} width={benchWidth} height={benchHeight} fill="#f4f4f4" />
                    <Line points={[0, pitchHeight, benchWidth, pitchHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[0, pitchHeight, 0, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[benchWidth, pitchHeight, benchWidth, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Line points={[0, stageHeight, benchWidth, stageHeight]} stroke="#b0b0b0" strokeWidth={2} />
                    <Text x={12} y={pitchHeight + 10} text="控えエリア" fontSize={14} fill="#333333" />
                    <Rect x={0} y={0} width={pitchWidth} height={pitchHeight} fill={pitchColor} />
                    <Line points={[0, 0, pitchWidth, 0, pitchWidth, pitchHeight, 0, pitchHeight, 0, 0]} stroke={lineColor} strokeWidth={4} closed />
                    <Line points={[pitchWidth / 2, 0, pitchWidth / 2, pitchHeight]} stroke={lineColor} strokeWidth={3} />
                    <Circle x={pitchWidth / 2} y={pitchHeight / 2} radius={80} stroke={lineColor} strokeWidth={3} />
                    <Circle x={pitchWidth / 2} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Rect
                      x={0}
                      y={(pitchHeight - 320) / 2}
                      width={140}
                      height={320}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={pitchWidth - 140}
                      y={(pitchHeight - 320) / 2}
                      width={140}
                      height={320}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={0}
                      y={(pitchHeight - 180) / 2}
                      width={70}
                      height={180}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Rect
                      x={pitchWidth - 70}
                      y={(pitchHeight - 180) / 2}
                      width={70}
                      height={180}
                      stroke={lineColor}
                      strokeWidth={3}
                      fillEnabled={false}
                    />
                    <Circle x={120} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Circle x={pitchWidth - 120} y={pitchHeight / 2} radius={4} fill={lineColor} />
                    <Line
                      points={createArcPoints(0, 0, 20, 0, 90)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth, 0, 20, 90, 180)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth, pitchHeight, 20, 180, 270)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(0, pitchHeight, 20, 270, 360)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(120, pitchHeight / 2, 60, 290, 70)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    <Line
                      points={createArcPoints(pitchWidth - 120, pitchHeight / 2, 60, 110, 250)}
                      stroke={lineColor}
                      strokeWidth={3}
                      tension={0}
                    />
                    {balls.map(ball => (
                      <Group
                        key={ball.id}
                        x={ball.x}
                        y={ball.y}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'ball', ball.id)}
                        onDragStart={(e) => prepareDragGroup('ball', ball.id, e.target.x(), e.target.y())}
                        onDragMove={(e) => handleGroupDragMove(e, 'ball', ball.id)}
                        onDragEnd={() => handleGroupDragEnd()}
                      >
                        <Circle
                          x={0}
                          y={0}
                          radius={14}
                          fill={ball.color || ballColor}
                          stroke="transparent"
                        />
                        {isSelectedItem('ball', ball.id) && (
                          <Circle
                            x={0}
                            y={0}
                            radius={16}
                            stroke="#ffd600"
                            strokeWidth={2}
                          />
                        )}
                      </Group>
                    ))}
                    {players.map(player => (
                      <React.Fragment key={player.id}>
                        <Circle
                          x={player.x}
                          y={player.y}
                          radius={20}
                          fill={player.color}
                          stroke={player.isSelected ? '#d32f2f' : '#ffffff'}
                          strokeWidth={player.isSelected ? 4 : 1.5}
                          draggable
                          onClick={(e) => handleSelectItem(e, 'player', player.id)}
                          onDblClick={(e) => {
                            e.cancelBubble = true;
                            handlePlayerNameChange(player.id);
                          }}
                          onDragStart={(e) => prepareDragGroup('player', player.id, e.target.x(), e.target.y())}
                          onDragMove={(e) => handleGroupDragMove(e, 'player', player.id)}
                          onDragEnd={(e) => handlePlayerDragEnd(player.id, e)}
                        />
                        <Text
                          x={player.x - 10}
                          y={player.y - 10}
                          width={20}
                          text={player.number.toString()}
                          fontSize={14}
                          fill={playerNumberColor}
                          align="center"
                          listening={false}
                        />
                        <Text
                          x={player.x - 50}
                          y={player.y + 24}
                          width={100}
                          text={player.name}
                          fontSize={12}
                          fill={playerNameColor}
                          align="center"
                          listening={false}
                        />
                      </React.Fragment>
                    ))}
                    {arrows.map(arrow => (
                      <Arrow
                        key={arrow.id}
                        points={arrow.points}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={isSelectedItem('arrow', arrow.id) ? '#ffd600' : 'red'}
                        stroke={isSelectedItem('arrow', arrow.id) ? '#ffd600' : 'red'}
                        strokeWidth={isSelectedItem('arrow', arrow.id) ? 4 : 3}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'arrow', arrow.id)}
                        onDragStart={() => {
                          const stage = stageRef.current?.getStage();
                          const pos = stage?.getPointerPosition();
                          prepareDragGroup('arrow', arrow.id, pos?.x ?? 0, pos?.y ?? 0);
                        }}
                        onDragMove={(e) => handleGroupDragMove(e, 'arrow', arrow.id)}
                        onDragEnd={(e) => handleArrowDragEnd(arrow.id, e)}
                      />
                    ))}
                    {texts.map(textData => (
                      <Text
                        key={textData.id}
                        x={textData.x}
                        y={textData.y}
                        text={textData.text}
                        fontSize={textData.fontSize ?? 16}
                        fontStyle={textData.fontStyle ?? 'normal'}
                        fill={textData.color ?? '#000000'}
                        stroke={isSelectedItem('text', textData.id) ? '#ffd600' : undefined}
                        strokeWidth={isSelectedItem('text', textData.id) ? 1 : 0}
                        draggable
                        onClick={(e) => handleSelectItem(e, 'text', textData.id)}
                        onDragStart={(e) => prepareDragGroup('text', textData.id, e.target.x(), e.target.y())}
                        onDragMove={(e) => handleGroupDragMove(e, 'text', textData.id)}
                        onDragEnd={() => handleTextDragEnd(textData.id)}
                        onDblClick={(e) => {
                          e.cancelBubble = true;
                          const newText = prompt('新しいテキスト:', textData.text);
                          if (newText !== null) handleTextChange(textData.id, newText);
                        }}
                      />
                    ))}
                    {selectionBox.visible && (
                      <Rect
                        x={selectionBox.x}
                        y={selectionBox.y}
                        width={selectionBox.width}
                        height={selectionBox.height}
                        stroke="#1e88e5"
                        strokeWidth={1}
                        dash={[6, 4]}
                        fill="rgba(30, 136, 229, 0.24)"
                        listening={false}
                      />
                    )}
                  </Layer>
                </Stage>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  Menu,
  MatchCardSkeleton,
  NewsCardSkeleton,
  Pagination,
  ScrollArea,
  Select,
  Separator,
  Sheet,
  Skeleton,
  Spinner,
  Table,
  Tabs,
  Textarea,
  Toaster,
  Tooltip,
  useToast,
  type TableColumn,
} from "@/components/ui";

interface DemoRow {
  id: number;
  name: string;
  points: number;
  form: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardContent className="flex flex-wrap items-center gap-3">{children}</CardContent>
    </Card>
  );
}

export function DemoShowcase() {
  const [tab, setTab] = useState("a");
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [select, setSelect] = useState("football");
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  const columns: TableColumn<DemoRow>[] = [
    { key: "name", header: "Đội" },
    { key: "points", header: "Điểm", align: "right" },
    { key: "form", header: "Form", align: "center" },
  ];
  const rows: DemoRow[] = [
    { id: 1, name: "Manchester City", points: 88, form: "W W D" },
    { id: 2, name: "Arsenal", points: 84, form: "W L W" },
    { id: 3, name: "Liverpool", points: 79, form: "D W W" },
  ];

  return (
    <Toaster>
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="text-2xl font-bold">UI Kit Demo</h1>

        <Section title="Button">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </Section>

        <Section title="Badge">
          <Badge>Default</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">FT</Badge>
          <Badge variant="warning">HT</Badge>
          <Badge variant="live" className="animate-pulse-live">LIVE 67&apos;</Badge>
          <Badge variant="muted">Hoãn</Badge>
        </Section>

        <Section title="Tabs">
          <div className="w-full">
            <Tabs
              tabs={[
                { key: "a", label: "Tổng quan" },
                { key: "b", label: "Lịch đấu" },
                { key: "c", label: "Đội hình" },
              ]}
              value={tab}
              onValueChange={setTab}
            />
            <p className="mt-2 text-sm text-muted-foreground">Tab hiện tại: {tab}</p>
          </div>
        </Section>

        <Card>
          <CardHeader title="Table" />
          <CardContent>
            <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
          </CardContent>
        </Card>

        <Section title="Skeleton / Spinner">
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <MatchCardSkeleton />
            <NewsCardSkeleton />
          </div>
          <Skeleton className="h-4 w-32" />
          <Spinner label="Đang tải…" />
        </Section>

        <Section title="Empty / Error">
          <div className="w-full">
            <EmptyState title="Không có trận đấu hôm nay." hint="Thử chọn ngày khác." />
          </div>
          <div className="w-full">
            <ErrorState message="Không thể tải dữ liệu. Thử lại." onRetry={() => setRetryCount((n) => n + 1)} />
          </div>
        </Section>

        <Section title="Form">
          <Input label="Email" placeholder="you@example.com" />
          <Input label="Lỗi" error="Email không hợp lệ" defaultValue="abc" />
          <Textarea label="Nội dung" placeholder="Viết gì đó…" className="w-64" />
          <Select
            label="Môn thể thao"
            value={select}
            onChange={(e) => setSelect(e.target.value)}
            options={[
              { value: "football", label: "Bóng đá" },
              { value: "basketball", label: "Bóng rổ" },
              { value: "tennis", label: "Tennis" },
            ]}
          />
        </Section>

        <Section title="Overlay">
          <Button onClick={() => setSheet(true)}>Mở Sheet</Button>
          <Button onClick={() => setDialog(true)}>Mở Dialog</Button>
          <Sheet open={sheet} onClose={() => setSheet(false)} title="Drawer">
            <p className="text-sm text-muted-foreground">Mobile drawer (md:hidden).</p>
          </Sheet>
          <Dialog open={dialog} onClose={() => setDialog(false)} title="Xác nhận">
            <p className="text-sm">Nội dung dialog.</p>
          </Dialog>
        </Section>

        <Section title="Toast">
          <Button onClick={() => toast({ title: "Đã lưu." })}>Default</Button>
          <Button variant="outline" onClick={() => toast({ title: "Lưu thành công.", variant: "success" })}>
            Success
          </Button>
          <Button variant="destructive" onClick={() => toast({ title: "Có lỗi xảy ra.", variant: "error" })}>
            Error
          </Button>
        </Section>

        <Section title="Pagination">
          <Pagination page={page} totalPages={12} onChange={setPage} />
        </Section>

        <Section title="Avatar / Tooltip / Separator / ScrollArea">
          <Avatar name="Manchester United" />
          <Avatar name="Nguyễn Văn A" className="h-12 w-12" />
          <Tooltip content="Tooltip hover">
            <Button variant="outline">Hover tôi</Button>
          </Tooltip>
          <Separator className="w-16" vertical />
          <ScrollArea className="h-20 w-40 rounded-md border border-border p-2">
            <p className="text-sm">ScrollArea: nội dung dài… 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16</p>
          </ScrollArea>
        </Section>

        <Section title="Menu">
          <Menu
            trigger={({ toggle }) => <Button variant="outline" onClick={toggle}>Mở menu</Button>}
            items={[
              { key: "1", label: "Hồ sơ" },
              { key: "2", label: "Cài đặt" },
              { key: "3", separatorBefore: true, destructive: true, label: "Đăng xuất" },
            ]}
          />
        </Section>

        <p className="text-xs text-muted-foreground">Error retry đã bấm: {retryCount} lần</p>
      </div>
    </Toaster>
  );
}

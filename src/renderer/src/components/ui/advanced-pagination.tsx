import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
  size?: "default" | "small";
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className,
  size = "default",
}: AdvancedPaginationProps) {
  const [jumpPage, setJumpPage] = useState("");

  // 生成页码数组
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 4) {
      // 如果总页数小于等于7，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总是显示第一页
      pages.push(1);
      
      if (currentPage <= 4) {
        // 当前页在前4页，显示 1,2,3,4,5,...,last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页在后4页，显示 1,...,last-4,last-3,last-2,last-1,last
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间，显示 1,...,current-1,current,current+1,...,last
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleJump = () => {
    const page = parseInt(jumpPage);
    if (page >= 1) {
      // 如果传入的页数大于总页数，则跳转到最后一页
      const targetPage = page > totalPages ? totalPages : page;
      onPageChange(targetPage);
      setJumpPage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJump();
    }
  };

  if (totalItems === 0) {
    return null;
  }

  const isSmall = size === "small";

  return (
    <div className={cn("flex items-center justify-center", isSmall ? "gap-1" : "gap-2", className)}>
      {/* 总数据条数 */}
      <div className={cn("text-muted-foreground", isSmall ? "text-xs mr-0" : "text-sm mr-4")}>
        共 {totalItems} 条数据
      </div>

      {/* 上一页按钮 */}
      <Button
        variant="default"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={isSmall ? "h-7 w-5 p-0" : "h-9 w-9 p-0"}
      >
        <ChevronLeft className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
      </Button>

      {/* 页码按钮 */}
      <div className={cn("flex items-center", isSmall ? "gap-1" : "gap-3")}>
        {generatePageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className={cn("text-muted-foreground", isSmall ? "px-1 py-0.5 text-xs" : "px-2 py-1")}>...</span>
            ) : (
              <Button
                variant={currentPage === page ? "select" : "default"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={isSmall ? "h-7 w-5 p-0 text-xs" : "h-9 w-9 p-0"}
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 下一页按钮 */}
      <Button
        variant="default"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={isSmall ? "h-7 w-5 p-0" : "h-9 w-9 p-0"}
      >
        <ChevronRight className={isSmall ? "h-3 w-3" : "h-4 w-4"} />
      </Button>

      {/* 跳转功能 */}
      <div className={cn("flex items-center", isSmall ? "gap-1 ml-0" : "gap-2 ml-4")}>
        <Input
          type="number"
          placeholder="页码"
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          onKeyPress={handleKeyPress}
          className={cn(
            "text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]",
            isSmall ? "w-[40px] h-7 text-xs px-1" : "w-[72px] h-9"
          )}
          min="1"
          max={totalPages}
        />
        <Button
          variant="default"
          size="sm"
          onClick={handleJump}
          className={isSmall ? "h-7 px-1 text-xs" : "h-9 px-3"}
        >
          跳转
        </Button>
      </div>
    </div>
  );
}

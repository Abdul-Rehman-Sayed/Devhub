import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import Navbar from "../Navbar";
import ConfirmModal from "../ConfirmModal";
import toast from "react-hot-toast";

const btn = {
  padding: "6px 12px",
  backgroundColor: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-primary)",
  cursor: "pointer",
  fontSize: "13px",
};
const dangerBtn = {
  ...btn,
  backgroundColor: "transparent",
  border: "1px solid var(--danger)",
  color: "var(--danger)",
};
const smallBtn = { ...btn, padding: "4px 10px", fontSize: "12px" };
const smallDangerBtn = { ...dangerBtn, padding: "4px 10px", fontSize: "12px" };

const RepoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("code");
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const { authAxios, currentUser } = useAuth();

  const [isStarred, setIsStarred] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [confirm, setConfirm] = useState(null);

  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const MAX_FILE_KB = 100;

  const ownerId = repo ? String(repo.owner?._id ?? repo.owner ?? "") : "";
  const isOwner = !!currentUser && ownerId === String(currentUser);

  const refreshIssues = async () => {
    const issuesRes = await authAxios.get(`/repo/${id}/issues`);
    setIssues(issuesRes.data);
  };

  const refreshFiles = async () => {
    try {
      const { data } = await authAxios.get(`/repo/${id}/files`);
      setFiles(data.files || []);
    } catch (e) {
      void e;
    }
  };

  const readAndUpload = async (fileList) => {
    const arr = [...fileList];
    if (arr.length === 0) return;
    for (const f of arr) {
      if (f.size > MAX_FILE_KB * 1024) {
        toast.error(`${f.name} is larger than ${MAX_FILE_KB} KB`);
        return;
      }
    }
    try {
      setUploading(true);
      const payload = await Promise.all(
        arr.map(async (f) => ({
          path: f.webkitRelativePath || f.name,
          content: await f.text(),
        }))
      );
      const { data } = await authAxios.post(`/repo/${id}/files`, { files: payload });
      toast.success(`Uploaded — ${data.fileCount} file${data.fileCount === 1 ? "" : "s"} total`);
      await refreshFiles();
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickFiles = (e) => {
    readAndUpload(e.target.files);
    e.target.value = "";
  };

  const viewFile = async (p) => {
    try {
      const { data } = await authAxios.get(`/repo/${id}/file`, { params: { path: p } });
      setSelectedFile(data);
    } catch {
      toast.error("Failed to open file");
    }
  };

  const removeFile = (p) => {
    setConfirm({
      title: "Delete file",
      message: `Remove "${p}" from this repository?`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await authAxios.delete(`/repo/${id}/file`, { params: { path: p } });
          if (selectedFile?.path === p) setSelectedFile(null);
          await refreshFiles();
          toast.success("File deleted");
        } catch {
          toast.error("Failed to delete file");
        }
      },
    });
  };

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const { data } = await authAxios.get(`/repo/${id}`);
        setRepo(data);
        const issuesRes = await authAxios.get(`/repo/${id}/issues`);
        setIssues(issuesRes.data);
        const filesRes = await authAxios.get(`/repo/${id}/files`);
        setFiles(filesRes.data.files || []);

        const repoOwnerId = String(data.owner?._id ?? data.owner ?? "");

        if (currentUser) {
          const userRes = await authAxios.get(`/userProfile/${currentUser}`);
          const profile = userRes.data?.user;
          if (profile?.starRepos) {
            setIsStarred(profile.starRepos.some((r) => r._id === id || r === id));
          }
          if (profile?.followedUsers) {
            setIsFollowing(
              profile.followedUsers.some((u) => String(u._id ?? u) === repoOwnerId)
            );
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch repository details");
      } finally {
        setLoading(false);
      }
    };
    fetchRepo();
  }, [id, authAxios, currentUser]);

  const toggleStar = async () => {
    try {
      await authAxios.post(`/toggleStar/${id}`);
      setIsStarred(!isStarred);
      toast.success(isStarred ? "Repository unstarred" : "Repository starred");
    } catch {
      toast.error("Failed to toggle star");
    }
  };

  const toggleFollow = async () => {
    try {
      await authAxios.post(`/toggleFollow/${ownerId}`);
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed user" : "Followed user");
    } catch {
      toast.error("Failed to toggle follow");
    }
  };

  const toggleVisibility = async () => {
    try {
      const { data } = await authAxios.patch(`/repo/toggle/${id}`);
      setRepo((prev) => ({ ...prev, visibility: data.newVisibility }));
      toast.success(data.newVisibility ? "Repository is now public" : "Repository is now private");
    } catch {
      toast.error("Failed to change visibility");
    }
  };

  const startEditDesc = () => {
    setDescDraft(repo.description || "");
    setEditingDesc(true);
  };

  const saveDescription = async () => {
    try {
      await authAxios.put(`/repo/update/${id}`, { description: descDraft });
      setRepo((prev) => ({ ...prev, description: descDraft }));
      setEditingDesc(false);
      toast.success("Repository updated");
    } catch {
      toast.error("Failed to update repository");
    }
  };

  const deleteRepo = () => {
    setConfirm({
      title: "Delete repository",
      message: "This also removes its issues and cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await authAxios.delete(`/repo/delete/${id}`);
          toast.success("Repository deleted");
          navigate("/dashboard");
        } catch {
          toast.error("Failed to delete repository");
        }
      },
    });
  };

  const canManageIssue = (iss) =>
    isOwner || (!!iss.author && String(iss.author) === String(currentUser));

  const toggleIssueStatus = async (iss) => {
    const next = iss.status === "open" ? "closed" : "open";
    try {
      await authAxios.put(`/issue/update/${iss._id}`, { status: next });
      await refreshIssues();
      toast.success(next === "closed" ? "Issue closed" : "Issue reopened");
    } catch {
      toast.error("Failed to update issue");
    }
  };

  const deleteIssue = (issId) => {
    setConfirm({
      title: "Delete issue",
      message: "This issue will be permanently removed.",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await authAxios.delete(`/issue/delete/${issId}`);
          await refreshIssues();
          toast.success("Issue deleted");
        } catch {
          toast.error("Failed to delete issue");
        }
      },
    });
  };

  const runConfirm = async () => {
    if (confirm?.onConfirm) await confirm.onConfirm();
    setConfirm(null);
  };

  const createIssue = async (e) => {
    e.preventDefault();
    if (!newIssueTitle || !newIssueDesc) return toast.error("Title and description required");
    try {
      await authAxios.post(`/repo/${id}/issue/create`, {
        title: newIssueTitle,
        description: newIssueDesc,
      });
      toast.success("Issue created");
      setNewIssueTitle("");
      setNewIssueDesc("");
      await refreshIssues();
      setTab("issues");
    } catch {
      toast.error("Failed to create issue");
    }
  };

  if (loading) return <div><Navbar /><div style={{ padding: "40px", textAlign: "center" }}>Loading repository...</div></div>;
  if (!repo) return <div><Navbar /><div style={{ padding: "40px", textAlign: "center" }}>Repository not found.</div></div>;

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "24px", gap: "16px" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ color: "var(--accent-blue)" }}>{repo.name}</h1>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", border: "1px solid var(--border-muted)", borderRadius: "20px", padding: "2px 8px" }}>
                {repo.visibility ? "Public" : "Private"}
              </span>
            </div>
            {repo.owner?.username && (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                owned by {repo.owner.username}
              </p>
            )}

            {editingDesc ? (
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
                <input
                  type="text"
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  placeholder="Repository description"
                  style={{ flex: 1, minWidth: "240px", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
                />
                <button onClick={saveDescription} style={{ ...smallBtn, backgroundColor: "var(--accent-green-dark)", border: "1px solid var(--accent-green-dark)", color: "white" }}>Save</button>
                <button onClick={() => setEditingDesc(false)} style={smallBtn}>Cancel</button>
              </div>
            ) : (
              <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>
                {repo.description || "No description provided."}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={toggleStar} style={btn}>
              {isStarred ? "Unstar" : "Star"}
            </button>

            {!isOwner && repo.owner?.username && (
              <button onClick={toggleFollow} style={btn}>
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
            )}

            {isOwner && (
              <>
                {!editingDesc && (
                  <button onClick={startEditDesc} style={btn}>Edit</button>
                )}
                <button onClick={toggleVisibility} style={btn}>
                  {repo.visibility ? "Make Private" : "Make Public"}
                </button>
                <button onClick={deleteRepo} style={dangerBtn}>Delete</button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <button onClick={() => setTab("code")} style={{ padding: "8px 16px", background: tab === "code" ? "var(--bg-secondary)" : "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", cursor: "pointer" }}>Code</button>
          <button onClick={() => setTab("issues")} style={{ padding: "8px 16px", background: tab === "issues" ? "var(--bg-secondary)" : "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", cursor: "pointer" }}>Issues ({issues.length})</button>
          <button onClick={() => setTab("newIssue")} style={{ padding: "8px 16px", background: tab === "newIssue" ? "var(--accent-green-dark)" : "transparent", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "white", cursor: "pointer" }}>New Issue</button>
        </div>

        {tab === "code" && (
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "20px" }}>
            {isOwner && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={onPickFiles} />
                <input
                  ref={(el) => {
                    folderInputRef.current = el;
                    if (el) {
                      el.setAttribute("webkitdirectory", "");
                      el.setAttribute("directory", "");
                    }
                  }}
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={onPickFiles}
                />
                <button style={smallBtn} disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? "Uploading..." : "Upload files"}
                </button>
                <button style={smallBtn} disabled={uploading} onClick={() => folderInputRef.current?.click()}>
                  Upload folder
                </button>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Text/code only · max {MAX_FILE_KB} KB/file · 1 MB/repo · 50 files
                </span>
              </div>
            )}

            {files.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>This repository is empty.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 260px) 1fr", gap: "16px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
                  {files.map((f) => (
                    <div key={f.path} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <button
                        onClick={() => viewFile(f.path)}
                        title={f.path}
                        style={{ background: "none", border: "none", color: selectedFile?.path === f.path ? "var(--text-primary)" : "var(--accent-blue)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "13px", textAlign: "left", padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
                      >
                        {f.path}
                      </button>
                      {isOwner && (
                        <button onClick={() => removeFile(f.path)} title="Delete file" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "16px", lineHeight: 1, padding: "0 4px" }}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ minWidth: 0 }}>
                  {selectedFile ? (
                    <>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                        {selectedFile.path} · {selectedFile.size} bytes
                      </div>
                      <pre style={{ margin: 0, padding: "12px", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflowX: "auto", fontSize: "13px", maxHeight: "480px", color: "var(--text-primary)" }}>
                        {selectedFile.content}
                      </pre>
                    </>
                  ) : (
                    <p style={{ color: "var(--text-muted)" }}>Select a file to view its contents.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "issues" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {issues.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-md)", color: "var(--text-muted)" }}>No issues open.</div>
            ) : (
              issues.map((iss) => (
                <div key={iss._id} style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                  <h3 style={{ marginBottom: "8px" }}>{iss.title}</h3>
                  <p style={{ color: "var(--text-secondary)" }}>{iss.description}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-block", fontSize: "12px", padding: "2px 8px", backgroundColor: iss.status === "open" ? "var(--accent-green-dark)" : "var(--danger)", borderRadius: "10px", color: "white" }}>
                      {iss.status}
                    </span>
                    {canManageIssue(iss) && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => toggleIssueStatus(iss)} style={smallBtn}>
                          {iss.status === "open" ? "Close" : "Reopen"}
                        </button>
                        <button onClick={() => deleteIssue(iss._id)} style={smallDangerBtn}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "newIssue" && (
          <form onSubmit={createIssue} style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "600px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "20px" }}>
            <input
              type="text"
              placeholder="Issue title"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
            />
            <textarea
              placeholder="Leave a comment"
              value={newIssueDesc}
              onChange={(e) => setNewIssueDesc(e.target.value)}
              rows="6"
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", resize: "vertical" }}
            />
            <button type="submit" style={{ padding: "8px 16px", backgroundColor: "var(--accent-green-dark)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", alignSelf: "flex-start" }}>Submit new issue</button>
          </form>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText={confirm?.confirmText}
        danger
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
};

export default RepoDetail;

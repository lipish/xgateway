--
-- PostgreSQL database dump
--

-- Dumped from database version 18.1 (Homebrew)
-- Dumped by pg_dump version 18.1 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id bigint NOT NULL,
    owner_id bigint,
    key_hash character varying(128) NOT NULL,
    name character varying(100) NOT NULL,
    scope character varying(20) DEFAULT 'global'::character varying,
    provider_id bigint,
    qps_limit double precision DEFAULT 10.0,
    concurrency_limit integer DEFAULT 5,
    status character varying(20) DEFAULT 'active'::character varying,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    provider_ids text,
    project_id bigint DEFAULT 1 NOT NULL,
    protocol text DEFAULT 'openai'::text NOT NULL,
    strategy text DEFAULT 'Priority'::text NOT NULL,
    fallback_chain text
);


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    token text NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config (
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id bigint NOT NULL,
    title text DEFAULT '新对话'::text NOT NULL,
    provider_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    conversation_id bigint NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: org_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_users (
    org_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id bigint NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    owner_id bigint
);


--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id bigint NOT NULL,
    org_id bigint NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: provider_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_types (
    id text NOT NULL,
    label text NOT NULL,
    base_url text NOT NULL,
    models text NOT NULL,
    docs_url text DEFAULT ''::text,
    enabled boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    driver_type character varying DEFAULT 'openai_compatible'::character varying NOT NULL
);


--
-- Name: providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.providers (
    id bigint NOT NULL,
    name character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    config text NOT NULL,
    enabled boolean DEFAULT true,
    priority integer DEFAULT 0,
    endpoint text,
    secret_id text,
    secret_key text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    version bigint DEFAULT 0 NOT NULL,
    owner_id bigint
);


--
-- Name: providers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.providers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.providers_id_seq OWNED BY public.providers.id;


--
-- Name: request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_logs (
    id bigint NOT NULL,
    provider_id bigint,
    provider_name text NOT NULL,
    model text NOT NULL,
    status text NOT NULL,
    latency_ms integer DEFAULT 0 NOT NULL,
    tokens_used integer DEFAULT 0 NOT NULL,
    error_message text,
    request_type text DEFAULT 'chat'::text NOT NULL,
    request_content text,
    response_content text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    api_key_id bigint,
    project_id bigint,
    org_id bigint,
    CONSTRAINT request_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'timeout'::text])))
);


--
-- Name: request_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.request_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: request_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.request_logs_id_seq OWNED BY public.request_logs.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    permissions text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_instances (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    provider_id bigint NOT NULL,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    granted_by bigint
);


--
-- Name: user_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_instances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_instances_id_seq OWNED BY public.user_instances.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id character varying(50),
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: providers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers ALTER COLUMN id SET DEFAULT nextval('public.providers_id_seq'::regclass);


--
-- Name: request_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_logs ALTER COLUMN id SET DEFAULT nextval('public.request_logs_id_seq'::regclass);


--
-- Name: user_instances id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances ALTER COLUMN id SET DEFAULT nextval('public.user_instances_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: auth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

--
-- Data for Name: config; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.config VALUES ('setup_completed', 'false', '2026-02-22 20:15:58.06567+08', '2026-02-22 20:15:58.06567+08');
INSERT INTO public.config VALUES ('version', '1.0.0', '2026-02-22 20:15:58.06567+08', '2026-02-22 20:15:58.06567+08');


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: org_users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.org_users VALUES (1, 1, 'member', '2026-02-22 20:15:58.395955+08', '2026-02-22 20:15:58.395955+08');


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.organizations VALUES (1, 'default', 'active', '2026-02-22 20:15:58.390914+08', '2026-02-22 20:15:58.390914+08', NULL);


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.projects VALUES (1, 1, 'default', 'active', '2026-02-22 20:15:58.390914+08', '2026-02-22 20:15:58.390914+08');


--
-- Data for Name: provider_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.provider_types VALUES ('aliyun', 'Aliyun Bailian', 'https://dashscope.aliyuncs.com/compatible-mode/v1', '[
        {
            "id": "qwen3-max",
            "name": "Qwen3 Max",
            "description": "Latest flagship, best for agentic coding and tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0025,
            "output_price": 0.01
        },
        {
            "id": "qwen3.5-plus",
            "name": "Qwen3.5 Plus",
            "description": "Balanced performance, speed and cost, text/image/video input",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen-max",
            "name": "Qwen Max",
            "description": "Previous flagship for complex multi-step tasks",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0032,
            "output_price": 0.0128
        },
        {
            "id": "qwen-plus",
            "name": "Qwen Plus", 
            "description": "Balanced performance, speed and cost, suitable for medium complexity tasks",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen-flash",
            "name": "Qwen Flash",
            "description": "Suitable for simple tasks with fast speed and low cost",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.00015,
            "output_price": 0.0015
        },
        {
            "id": "qwen-coder-turbo",
            "name": "Qwen Coder Turbo",
            "description": "Excellent code model, proficient in tool calling and environment interaction",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.001,
            "output_price": 0.004
        },
        {
            "id": "qwen-vl-max",
            "name": "Qwen VL Max",
            "description": "Multimodal model with powerful vision understanding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.002,
            "output_price": 0.02
        },
        {
            "id": "qwen-audio-turbo",
            "name": "Qwen Audio Turbo",
            "description": "Audio understanding model",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.01
        },
        {
            "id": "qwen-long",
            "name": "Qwen Long",
            "description": "Long text processing model with longest context window",
            "supports_tools": true,
            "context_length": 10000000,
            "input_price": 0.0005,
            "output_price": 0.002
        },
        {
            "id": "qwq-plus",
            "name": "QwQ Plus",
            "description": "Reasoning model with outstanding math and code capabilities",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.004
        }
    ]', 'https://bailian.console.aliyun.com', true, 12, '2026-02-22 20:15:58.404441+08', '2026-02-22 20:15:58.404441+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1', '[
        {
            "id": "deepseek-chat",
            "name": "DeepSeek Chat",
            "description": "General chat model with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 8.0
        },
        {
            "id": "deepseek-reasoner",
            "name": "DeepSeek Reasoner",
            "description": "Reasoning model with 128K context, max 64K output",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 4.0,
            "output_price": 16.0
        }
    ]', 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing', true, 10, '2026-02-22 20:15:58.404987+08', '2026-02-22 20:15:58.404987+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('longcat', 'LongCat', 'https://api.longcat.chat/openai/v1', '[
        {
            "id": "LongCat-Flash-Chat",
            "name": "LongCat Flash Chat",
            "description": "High-performance general chat model",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "LongCat-Flash-Thinking",
            "name": "LongCat Flash Thinking",
            "description": "Deep thinking model",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://longcat.chat/platform/docs/zh/', true, 14, '2026-02-22 20:15:58.405432+08', '2026-02-22 20:15:58.405432+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('tencent', 'Tencent Hunyuan', 'https://hunyuan.tencentcloudapi.com', '[
        {
            "id": "hunyuan-2.0-thinking-20251109",
            "name": "Tencent HY 2.0 Think",
            "description": "Hunyuan 2.0 thinking model with enhanced complex instruction following, multi-turn and long-text understanding, code, agent, and reasoning capabilities",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-2.0-instruct-20251111",
            "name": "Tencent HY 2.0 Instruct",
            "description": "Hunyuan 2.0 instruction model with enhanced instruction following, multi-turn and long-text understanding, creative writing, knowledge accuracy, code and reasoning capabilities",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-latest",
            "name": "Hunyuan T1 Latest",
            "description": "Industry''s first large-scale Hybrid-Transformer-Mamba reasoning model with extended reasoning capability and ultra-fast decoding speed",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-a13b",
            "name": "Hunyuan A13B",
            "description": "Hunyuan MoE structure with 80B total parameters, 13B activation, supports fast/slow thinking mode switching",
            "supports_tools": true,
            "context_length": 229376,
            "max_output": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-latest",
            "name": "Hunyuan TurboS Latest",
            "description": "Latest version of Hunyuan flagship model with stronger thinking capabilities and better experience",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-lite",
            "name": "Hunyuan Lite",
            "description": "Upgraded to MOE structure with 256K context window, leading many open-source models in multiple benchmarks",
            "supports_tools": true,
            "context_length": 256000,
            "max_output": 6144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation",
            "name": "Hunyuan Translation",
            "description": "Supports 33 language translations and 5 ethnic language translations, ranked 1st in 30 languages at WMT25",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation-lite",
            "name": "Hunyuan Translation Lite",
            "description": "Translation specialized model based on Hunyuan 2B-Dense, supports 16+ language translations",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-role-latest",
            "name": "Hunyuan Large Role Latest",
            "description": "Role-playing specialized model with significantly improved character consistency and dialogue depth",
            "supports_tools": false,
            "context_length": 28672,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-vision-1.5-instruct",
            "name": "Tencent HY Vision 1.5 Instruct",
            "description": "Image-to-text fast thinking model with significant improvements in image recognition, analysis and reasoning",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-vision-20250916",
            "name": "Hunyuan T1 Vision",
            "description": "Vision deep thinking model with comprehensive improvements in general image-text Q&A, visual grounding, OCR, charts, problem solving, and image-based creation",
            "supports_tools": true,
            "context_length": 28672,
            "max_output": 20480,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-vision",
            "name": "Hunyuan Large Vision",
            "description": "Vision-language model based on Hunyuan Large, supports arbitrary resolution multiple images + text input",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 8192,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-vision-video",
            "name": "Hunyuan TurboS Vision Video",
            "description": "Video understanding model supporting video description, video Q&A and other basic video understanding capabilities",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 8192,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://cloud.tencent.com/document/product/1729/104753', true, 16, '2026-02-22 20:15:58.406975+08', '2026-02-22 20:15:58.406975+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('volcengine', 'Volcengine', 'https://ark.cn-beijing.volces.com/api/v3', '[
        {
            "id": "doubao-seed-1-8-251215",
            "name": "Doubao Seed 1.8",
            "description": "Most powerful multimodal agent model with enhanced capabilities",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-code-preview-251028",
            "name": "Doubao Seed Code Preview",
            "description": "Programming enhanced - deep thinking, text generation, multimodal understanding, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-lite-251015",
            "name": "Doubao Seed 1.6 Lite",
            "description": "Lightweight model with deep thinking, text generation, multimodal understanding, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-flash-250828",
            "name": "Doubao Seed 1.6 Flash",
            "description": "Fast model with deep thinking, text generation, vision grounding, multimodal understanding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-vision-250815",
            "name": "Doubao Seed 1.6 Vision",
            "description": "Vision model with deep thinking, multimodal understanding, GUI task processing",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-translation-250915",
            "name": "Doubao Seed Translation",
            "description": "Translation enhanced model",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-2-251201",
            "name": "DeepSeek V3.2",
            "description": "Deep thinking, text generation, tool calling",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-1-terminus",
            "name": "DeepSeek V3.1 Terminus",
            "description": "Deep thinking, text generation, tool calling",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "kimi-k2-thinking-251104",
            "name": "Kimi K2 Thinking",
            "description": "Deep thinking, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedance-1-5-pro-251215",
            "name": "Doubao Seedance 1.5 Pro",
            "description": "Powerful video generation model with high-precision audio-visual sync",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedream-4-5-251128",
            "name": "Doubao Seedream 4.5",
            "description": "Powerful image generation model with multi-image fusion and strong editing consistency",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://www.volcengine.com/docs/82379/1330310', true, 11, '2026-02-22 20:15:58.407406+08', '2026-02-22 20:15:58.407406+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('moonshot', 'Moonshot AI', 'https://api.moonshot.cn/v1', '[
        {
            "id": "kimi-k2.5",
            "name": "Kimi K2.5",
            "description": "Latest flagship, 256K context, 1T params MoE, Agent Swarm",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 21.0
        },
        {
            "id": "kimi-k2-0905-preview",
            "name": "Kimi K2 0905",
            "description": "Latest K2 model with 256K context, strong Agentic Coding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-turbo-preview",
            "name": "Kimi K2 Turbo",
            "description": "High-speed K2 with 256K context, 60-100 tokens/s",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-k2-0711-preview",
            "name": "Kimi K2 0711",
            "description": "Earlier K2 version with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking",
            "name": "Kimi K2 Thinking",
            "description": "Deep reasoning model with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking-turbo",
            "name": "Kimi K2 Thinking Turbo",
            "description": "High-speed deep reasoning with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-latest",
            "name": "Kimi Latest",
            "description": "Auto-select model based on context (8K/32K/128K), vision support",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-8k",
            "name": "Moonshot V1 8K",
            "description": "Classic v1 model with 8K context",
            "supports_tools": true,
            "context_length": 8192,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-32k",
            "name": "Moonshot V1 32K",
            "description": "Classic v1 model with 32K context",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 5.0,
            "output_price": 20.0
        },
        {
            "id": "moonshot-v1-128k",
            "name": "Moonshot V1 128K",
            "description": "Classic v1 model with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 10.0,
            "output_price": 30.0
        }
    ]', 'https://platform.moonshot.cn/docs/guide/model-list', true, 13, '2026-02-22 20:15:58.40631+08', '2026-02-22 20:15:58.40631+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('openai', 'OpenAI', 'https://api.openai.com/v1', '[
        {
            "id": "gpt-5.2",
            "name": "GPT-5.2",
            "description": "Best general-purpose, complex reasoning, tool calling, vision",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-5.2-pro",
            "name": "GPT-5.2 Pro",
            "description": "Harder thinking for tough problems",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 5.0,
            "output_price": 20.0
        },
        {
            "id": "gpt-5.2-codex",
            "name": "GPT-5.2 Codex",
            "description": "Interactive coding products",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-5-mini",
            "name": "GPT-5 Mini",
            "description": "Cost-optimized reasoning and chat",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.4,
            "output_price": 1.6
        },
        {
            "id": "gpt-5-nano",
            "name": "GPT-5 Nano",
            "description": "High-throughput, simple tasks",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.1,
            "output_price": 0.4
        },
        {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "description": "Flagship multimodal model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "description": "Fast and affordable",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.15,
            "output_price": 0.6
        },
        {
            "id": "gpt-4.1",
            "name": "GPT-4.1",
            "description": "Advanced reasoning",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "o1",
            "name": "o1",
            "description": "Advanced reasoning model",
            "supports_tools": false,
            "context_length": 200000,
            "input_price": 15.0,
            "output_price": 60.0
        },
        {
            "id": "o1-mini",
            "name": "o1 Mini",
            "description": "Efficient reasoning",
            "supports_tools": false,
            "context_length": 128000,
            "input_price": 3.0,
            "output_price": 12.0
        },
        {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "description": "Fast and economical",
            "supports_tools": true,
            "context_length": 16385,
            "input_price": 0.5,
            "output_price": 1.5
        }
    ]', 'https://platform.openai.com/docs/models', true, 1, '2026-02-22 20:15:58.411767+08', '2026-02-22 20:15:58.411767+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('anthropic', 'Anthropic', 'https://api.anthropic.com', '[
        {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6",
            "description": "Most intelligent for agents and coding",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 5.0,
            "output_price": 25.0
        },
        {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6",
            "description": "Best balance of speed and intelligence",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 3.0,
            "output_price": 15.0
        },
        {
            "id": "claude-haiku-4-5-20251001",
            "name": "Claude Haiku 4.5",
            "description": "Fastest with near-frontier intelligence",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 1.0,
            "output_price": 5.0
        },
        {
            "id": "claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5",
            "description": "Strong performance, 200K context",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 3.0,
            "output_price": 15.0
        },
        {
            "id": "claude-opus-4-5-20251101",
            "name": "Claude Opus 4.5",
            "description": "Latest Opus generation",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 5.0,
            "output_price": 25.0
        }
    ]', 'https://docs.anthropic.com/en/docs/about-claude/models', true, 2, '2026-02-22 20:15:58.412204+08', '2026-02-22 20:15:58.412204+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('minimax', 'MiniMax', 'https://api.minimaxi.com/v1', '[
        {
            "id": "MiniMax-M2.5",
            "name": "MiniMax M2.5",
            "description": "Latest flagship, 200K context, advanced reasoning",
            "supports_tools": true,
            "context_length": 204800,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.5-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "description": "Same as M2.5 with faster inference (~100 tps)",
            "supports_tools": true,
            "context_length": 204800,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1",
            "name": "MiniMax M2.1",
            "description": "230B parameters, 10B activation, optimized for code generation and refactoring",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1-lightning",
            "name": "MiniMax M2.1 Lightning",
            "description": "Same performance as M2.1 with faster inference speed",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2",
            "name": "MiniMax M2",
            "description": "200K context, 128K output, supports function calling and advanced reasoning",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-hd",
            "name": "Speech 2.6 HD",
            "description": "Ultimate similarity, ultra-high quality voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-turbo",
            "name": "Speech 2.6 Turbo",
            "description": "Best cost-performance, low latency voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-hd",
            "name": "Speech 02 HD",
            "description": "Enhanced replication similarity, high quality voice generation, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-turbo",
            "name": "Speech 02 Turbo",
            "description": "Excellent prosody and stability, low latency, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3",
            "name": "MiniMax Hailuo 2.3",
            "description": "Text-to-video and image-to-video, 1080p/768p resolution, 6-10 seconds duration",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3Fast",
            "name": "MiniMax Hailuo 2.3 Fast",
            "description": "Image-to-video with ultimate physics control, high cost-effectiveness",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-02",
            "name": "MiniMax Hailuo 02",
            "description": "Text-to-video and image-to-video with SOTA instruction following and ultimate physics control",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "Music-2.0",
            "name": "Music 2.0",
            "description": "Text-to-music with enhanced musicality, natural vocals and smooth melodies",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://platform.minimaxi.com/docs/guides/models-intro', true, 15, '2026-02-22 20:15:58.405861+08', '2026-02-22 20:15:58.405861+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('zhipu', 'BigModel (Zhipu CN)', 'https://open.bigmodel.cn/api/paas/v4', '[
        {
            "id": "glm-5",
            "name": "GLM-5",
            "description": "Fifth gen flagship, 745B params, 200K context, SOTA reasoning",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.7",
            "name": "GLM-4.7",
            "description": "Latest flagship model, released December 2025",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.6",
            "name": "GLM-4.6",
            "description": "Flagship model with 200K context, advanced coding ability",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.6v",
            "name": "GLM-4.6V",
            "description": "Vision model with multimodal capabilities",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.3,
            "output_price": 0.9
        },
        {
            "id": "glm-4.6v-flashx",
            "name": "GLM-4.6V-FlashX",
            "description": "Ultra-fast vision model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.04,
            "output_price": 0.4
        },
        {
            "id": "glm-4.5",
            "name": "GLM-4.5",
            "description": "Strong performance with powerful reasoning and code generation, 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.5v",
            "name": "GLM-4.5V",
            "description": "Vision model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 1.8
        },
        {
            "id": "glm-4.5-x",
            "name": "GLM-4.5-X",
            "description": "Ultra-fast version with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.2,
            "output_price": 8.9
        },
        {
            "id": "glm-4.5-air",
            "name": "GLM-4.5 Air",
            "description": "Best performance at same parameter scale, 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.2,
            "output_price": 1.1
        },
        {
            "id": "glm-4.5-airx",
            "name": "GLM-4.5 AirX",
            "description": "Fast inference with cost-effective pricing",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 1.1,
            "output_price": 4.5
        },
        {
            "id": "glm-4-32b-0414-128k",
            "name": "GLM-4-32B-0414-128K",
            "description": "32B parameter model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.1,
            "output_price": 0.1
        },
        {
            "id": "glm-4.6v-flash",
            "name": "GLM-4.6V-Flash",
            "description": "Free vision model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "glm-4.5-flash",
            "name": "GLM-4.5-Flash",
            "description": "Free model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://open.bigmodel.cn/dev/howuse/model', true, 17, '2026-02-22 20:15:58.40782+08', '2026-02-22 20:15:58.40782+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('minimax_global', 'MiniMax Global', 'https://api.minimax.io/v1', '[
        {
            "id": "MiniMax-M2.5",
            "name": "MiniMax M2.5",
            "description": "Latest flagship, 200K context, advanced reasoning",
            "supports_tools": true,
            "context_length": 204800,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.5-highspeed",
            "name": "MiniMax M2.5 Highspeed",
            "description": "Same as M2.5 with faster inference (~100 tps)",
            "supports_tools": true,
            "context_length": 204800,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1",
            "name": "MiniMax M2.1",
            "description": "230B parameters, 10B activation, optimized for code generation and refactoring",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1-lightning",
            "name": "MiniMax M2.1 Lightning",
            "description": "Same performance as M2.1 with faster inference speed",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2",
            "name": "MiniMax M2",
            "description": "200K context, 128K output, supports function calling and advanced reasoning",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-hd",
            "name": "Speech 2.6 HD",
            "description": "Ultimate similarity, ultra-high quality voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-turbo",
            "name": "Speech 2.6 Turbo",
            "description": "Best cost-performance, low latency voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-hd",
            "name": "Speech 02 HD",
            "description": "Enhanced replication similarity, high quality voice generation, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-turbo",
            "name": "Speech 02 Turbo",
            "description": "Excellent prosody and stability, low latency, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3",
            "name": "MiniMax Hailuo 2.3",
            "description": "Text-to-video and image-to-video, 1080p/768p resolution, 6-10 seconds duration",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3Fast",
            "name": "MiniMax Hailuo 2.3 Fast",
            "description": "Image-to-video with ultimate physics control, high cost-effectiveness",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-02",
            "name": "MiniMax Hailuo 02",
            "description": "Text-to-video and image-to-video with SOTA instruction following and ultimate physics control",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "Music-2.0",
            "name": "Music 2.0",
            "description": "Text-to-music with enhanced musicality, natural vocals and smooth melodies",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]', 'https://platform.minimax.io/docs/guides/models-intro', true, 16, '2026-02-22 20:25:42.158427+08', '2026-02-22 20:25:42.158427+08', 'openai_compatible');
INSERT INTO public.provider_types VALUES ('moonshot_global', 'Moonshot AI Global', 'https://api.moonshot.ai/v1', '[
        {
            "id": "kimi-k2.5",
            "name": "Kimi K2.5",
            "description": "Latest flagship, 256K context, 1T params MoE, Agent Swarm",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 21.0
        },
        {
            "id": "kimi-k2-0905-preview",
            "name": "Kimi K2 0905",
            "description": "Latest K2 model with 256K context, strong Agentic Coding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-turbo-preview",
            "name": "Kimi K2 Turbo",
            "description": "High-speed K2 with 256K context, 60-100 tokens/s",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-k2-0711-preview",
            "name": "Kimi K2 0711",
            "description": "Earlier K2 version with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking",
            "name": "Kimi K2 Thinking",
            "description": "Deep reasoning model with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking-turbo",
            "name": "Kimi K2 Thinking Turbo",
            "description": "High-speed deep reasoning with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-latest",
            "name": "Kimi Latest",
            "description": "Auto-select model based on context (8K/32K/128K), vision support",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-8k",
            "name": "Moonshot V1 8K",
            "description": "Classic v1 model with 8K context",
            "supports_tools": true,
            "context_length": 8192,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-32k",
            "name": "Moonshot V1 32K",
            "description": "Classic v1 model with 32K context",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 5.0,
            "output_price": 20.0
        },
        {
            "id": "moonshot-v1-128k",
            "name": "Moonshot V1 128K",
            "description": "Classic v1 model with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 10.0,
            "output_price": 30.0
        }
    ]', 'https://platform.moonshot.ai/docs/overview', true, 14, '2026-02-22 20:25:42.158844+08', '2026-02-22 20:25:42.158844+08', 'openai_compatible');
--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: request_logs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.roles VALUES ('admin', 'Administrator', '["provider:*", "user:*", "api_key:*", "instance:grant"]', '2026-02-22 12:15:58.304384', '2026-02-22 12:15:58.304384');
INSERT INTO public.roles VALUES ('user', 'User', '["instance:view_granted", "api_key:view_granted"]', '2026-02-22 12:15:58.324069', '2026-02-22 12:15:58.324069');


--
-- Data for Name: user_instances; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES (1, 'admin', 'admin123', 'admin', 'active', '2026-02-22 12:15:58.337796', '2026-02-22 12:15:58.337796');


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 1, false);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, true);


--
-- Name: providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.providers_id_seq', 1, false);


--
-- Name: request_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.request_logs_id_seq', 1, false);


--
-- Name: user_instances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_instances_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (token);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (key);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: org_users org_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_users
    ADD CONSTRAINT org_users_pkey PRIMARY KEY (org_id, user_id);


--
-- Name: organizations organizations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_name_key UNIQUE (name);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: projects projects_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_org_id_name_key UNIQUE (org_id, name);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: provider_types provider_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_types
    ADD CONSTRAINT provider_types_pkey PRIMARY KEY (id);


--
-- Name: providers providers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_name_key UNIQUE (name);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: request_logs request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_instances user_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances
    ADD CONSTRAINT user_instances_pkey PRIMARY KEY (id);


--
-- Name: user_instances user_instances_user_id_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances
    ADD CONSTRAINT user_instances_user_id_provider_id_key UNIQUE (user_id, provider_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_owner ON public.api_keys USING btree (owner_id);


--
-- Name: idx_api_keys_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_project_id ON public.api_keys USING btree (project_id);


--
-- Name: idx_auth_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_tokens_user_id ON public.auth_tokens USING btree (user_id);


--
-- Name: idx_conversations_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_provider ON public.conversations USING btree (provider_id);


--
-- Name: idx_conversations_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_updated ON public.conversations USING btree (updated_at DESC);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);


--
-- Name: idx_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at);


--
-- Name: idx_org_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_users_user_id ON public.org_users USING btree (user_id);


--
-- Name: idx_organizations_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_owner_id ON public.organizations USING btree (owner_id);


--
-- Name: idx_projects_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_org_id ON public.projects USING btree (org_id);


--
-- Name: idx_provider_types_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_types_enabled ON public.provider_types USING btree (enabled);


--
-- Name: idx_provider_types_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_types_sort ON public.provider_types USING btree (sort_order, id);


--
-- Name: idx_providers_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_enabled ON public.providers USING btree (enabled);


--
-- Name: idx_providers_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_owner_id ON public.providers USING btree (owner_id);


--
-- Name: idx_providers_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_priority ON public.providers USING btree (priority DESC);


--
-- Name: idx_providers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_type ON public.providers USING btree (type);


--
-- Name: idx_providers_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_providers_version ON public.providers USING btree (version);


--
-- Name: idx_request_logs_api_key_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_api_key_id ON public.request_logs USING btree (api_key_id);


--
-- Name: idx_request_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_created_at ON public.request_logs USING btree (created_at DESC);


--
-- Name: idx_request_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_org_id ON public.request_logs USING btree (org_id);


--
-- Name: idx_request_logs_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_project_id ON public.request_logs USING btree (project_id);


--
-- Name: idx_request_logs_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_provider_id ON public.request_logs USING btree (provider_id);


--
-- Name: idx_request_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_request_logs_status ON public.request_logs USING btree (status);


--
-- Name: idx_user_instances_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_instances_provider ON public.user_instances USING btree (provider_id);


--
-- Name: idx_user_instances_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_instances_user ON public.user_instances USING btree (user_id);


--
-- Name: api_keys api_keys_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: org_users org_users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_users
    ADD CONSTRAINT org_users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_users org_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_users
    ADD CONSTRAINT org_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: providers providers_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: request_logs request_logs_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;


--
-- Name: user_instances user_instances_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances
    ADD CONSTRAINT user_instances_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_instances user_instances_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances
    ADD CONSTRAINT user_instances_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE CASCADE;


--
-- Name: user_instances user_instances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_instances
    ADD CONSTRAINT user_instances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--


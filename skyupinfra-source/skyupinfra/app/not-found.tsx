import Link from 'next/link';import {Compass} from 'lucide-react';
export default function NotFound(){return <main className="page-wrap wrap"><div className="admin-empty-state"><Compass size={35}/><h3>This discovery went a little off course.</h3><p>That page isn’t here. Let’s find another way.</p><Link className="button button-dark" href="/">Back to the store</Link></div></main>}
